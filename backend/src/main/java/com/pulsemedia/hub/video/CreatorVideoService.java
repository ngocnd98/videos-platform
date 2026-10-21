package com.pulsemedia.hub.video;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.storage.ObjectStorage;
import com.pulsemedia.hub.storage.ObjectStorage.UploadedPart;
import com.pulsemedia.hub.storage.StorageKeys;
import com.pulsemedia.hub.video.VideoDtos.CompleteUploadRequest;
import com.pulsemedia.hub.video.VideoDtos.FileInfo;
import com.pulsemedia.hub.video.VideoDtos.PartUrl;
import com.pulsemedia.hub.video.VideoDtos.StartUploadRequest;
import com.pulsemedia.hub.video.VideoDtos.UploadSession;
import com.pulsemedia.hub.video.VideoDtos.VideoDto;
import com.pulsemedia.hub.video.VideoDtos.VideoMetadata;
import com.pulsemedia.hub.video.VideoRepository.FileRow;
import com.pulsemedia.hub.video.VideoRepository.VideoRow;

/**
 * Creator side of the main flow: draft → direct multipart upload to R2 → submit for review.
 * The browser PUTs parts straight to R2 with presigned URLs; this service only coordinates.
 */
@Service
public class CreatorVideoService {

    static final long MAX_VIDEO_BYTES = 2L * 1024 * 1024 * 1024;
    // R2 requires every part except the last to be at least 5 MiB and all of the same size.
    static final long PART_SIZE = 10L * 1024 * 1024;
    static final long MAX_THUMBNAIL_BYTES = 2L * 1024 * 1024;

    private static final Set<String> EDITABLE = Set.of("DRAFT", "REJECTED");
    private static final Set<String> STATUSES = Set.of("DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "PUBLISHED");

    private final VideoRepository videos;
    private final ObjectStorage storage;
    private final StorageKeys keys;
    private final AuditLog audit;

    public CreatorVideoService(VideoRepository videos, ObjectStorage storage, StorageKeys keys, AuditLog audit) {
        this.videos = videos;
        this.storage = storage;
        this.keys = keys;
        this.audit = audit;
    }

    public List<VideoDto> list(CurrentUser user, String status) {
        if (status != null && !STATUSES.contains(status)) {
            throw ApiException.badRequest("Unknown status " + status);
        }
        return videos.listByCreator(user.creatorId(), status).stream().map(this::toDto).toList();
    }

    public VideoDto get(CurrentUser user, String code) {
        return toDto(owned(user, code));
    }

    @Transactional
    public VideoDto create(CurrentUser user, VideoMetadata metadata) {
        requireCategory(metadata.categoryId());
        String code = videos.createDraft(user.creatorId(), metadata);
        return toDto(owned(user, code));
    }

    @Transactional
    public VideoDto update(CurrentUser user, String code, VideoMetadata metadata) {
        VideoRow video = editable(user, code);
        requireCategory(metadata.categoryId());
        videos.updateMetadata(video.id(), metadata);
        return toDto(owned(user, code));
    }

    @Transactional
    public void deleteDraft(CurrentUser user, String code) {
        VideoRow video = owned(user, code);
        if (!"DRAFT".equals(video.status())) {
            throw ApiException.conflict("Only drafts can be deleted.");
        }
        videos.file(video.id(), "ORIGINAL")
                .filter(f -> f.uploadId() != null)
                .ifPresent(f -> storage.abortMultipartUpload(f.storageKey(), f.uploadId()));
        videos.delete(video.id());
    }

    /** Starts (or restarts from 0%) the upload of the original file. Any previous original is replaced. */
    @Transactional
    public UploadSession startUpload(CurrentUser user, String code, StartUploadRequest req) {
        VideoRow video = editable(user, code);
        if (!req.contentType().startsWith("video/")) {
            throw ApiException.badRequest("Only video files can be uploaded.");
        }
        if (req.size() > MAX_VIDEO_BYTES) {
            throw ApiException.badRequest("This video is larger than the 2 GB upload limit.");
        }
        videos.file(video.id(), "ORIGINAL")
                .filter(f -> f.uploadId() != null)
                .ifPresent(f -> storage.abortMultipartUpload(f.storageKey(), f.uploadId()));
        videos.deleteFiles(video.id(), "ORIGINAL");

        String key = keys.original(video.code(), req.fileName());
        String uploadId = storage.createMultipartUpload(key, req.contentType());
        videos.insertUploadingOriginal(video.id(), key, req.fileName(), req.size(), req.contentType(), uploadId);
        return session(uploadId, req.fileName(), req.size(), List.of());
    }

    /** Current upload state for resuming: which parts R2 already has. */
    public UploadSession uploadStatus(CurrentUser user, String code) {
        FileRow file = uploading(owned(user, code));
        List<UploadedPart> parts = storage.listParts(file.storageKey(), file.uploadId())
                .orElseThrow(() -> new ApiException(HttpStatus.GONE, "This upload session has expired. Please start again."));
        return session(file.uploadId(), file.fileName(), file.sizeBytes(), parts);
    }

    public List<PartUrl> partUrls(CurrentUser user, String code, List<Integer> partNumbers) {
        FileRow file = uploading(owned(user, code));
        int partCount = partCount(file.sizeBytes());
        return partNumbers.stream().distinct().map(n -> {
            if (n < 1 || n > partCount) {
                throw ApiException.badRequest("Part " + n + " is out of range 1.." + partCount);
            }
            return new PartUrl(n, storage.presignUploadPart(file.storageKey(), file.uploadId(), n));
        }).toList();
    }

    @Transactional
    public VideoDto completeUpload(CurrentUser user, String code, CompleteUploadRequest req) {
        VideoRow video = owned(user, code);
        FileRow file = uploading(video);
        int partCount = partCount(file.sizeBytes());
        Map<Integer, String> etags = new HashMap<>();
        req.parts().forEach(p -> etags.put(p.partNumber(), p.etag()));
        if (etags.size() != partCount || etags.keySet().stream().anyMatch(n -> n < 1 || n > partCount)) {
            throw ApiException.badRequest("Expected ETags for parts 1.." + partCount + ".");
        }
        storage.completeMultipartUpload(file.storageKey(), file.uploadId(),
                etags.entrySet().stream().map(e -> new UploadedPart(e.getKey(), e.getValue(), 0)).toList());

        long stored = storage.objectSize(file.storageKey())
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The uploaded file was not found in storage."));
        if (stored != file.sizeBytes()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Stored file size " + stored + " does not match the selected file (" + file.sizeBytes() + " bytes).");
        }
        videos.markFileAvailable(file.id());
        return toDto(video);
    }

    @Transactional
    public void abortUpload(CurrentUser user, String code) {
        VideoRow video = editable(user, code);
        videos.file(video.id(), "ORIGINAL").filter(f -> f.uploadId() != null).ifPresent(f -> {
            storage.abortMultipartUpload(f.storageKey(), f.uploadId());
            videos.deleteFiles(video.id(), "ORIGINAL");
        });
    }

    @Transactional
    public VideoDto saveThumbnail(CurrentUser user, String code, byte[] data, String contentType) {
        VideoRow video = editable(user, code);
        if (contentType == null || !(contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"))) {
            throw ApiException.badRequest("Thumbnail must be a JPEG, PNG or WebP image.");
        }
        if (data.length == 0 || data.length > MAX_THUMBNAIL_BYTES) {
            throw ApiException.badRequest("Thumbnail must be smaller than 2 MB.");
        }
        String key = keys.thumbnail(video.code());
        storage.putObject(key, data, contentType);
        videos.deleteFiles(video.id(), "THUMBNAIL");
        videos.insertThumbnail(video.id(), key, data.length, contentType);
        return toDto(video);
    }

    @Transactional
    public VideoDto submit(CurrentUser user, String code) {
        VideoRow video = editable(user, code);
        boolean hasFile = videos.file(video.id(), "ORIGINAL").filter(f -> "AVAILABLE".equals(f.status())).isPresent();
        if (!hasFile) {
            throw ApiException.conflict("Upload the video file before submitting it for review.");
        }
        videos.markSubmitted(video.id());
        videos.insertReviewLog(video.id(), "SUBMITTED", user.id());
        audit.record("VIDEO", video.code(), video.title(), "In Review", "Submitted by " + user.displayName(), user.id());
        return toDto(owned(user, code));
    }

    // --- helpers -------------------------------------------------------------------------

    private VideoRow owned(CurrentUser user, String code) {
        // Another creator's video is reported as missing rather than forbidden.
        return videos.findByCode(code)
                .filter(v -> user.creatorId() != null && v.creatorId() == user.creatorId())
                .orElseThrow(() -> ApiException.notFound("Video " + code + " not found."));
    }

    private VideoRow editable(CurrentUser user, String code) {
        VideoRow video = owned(user, code);
        if (!EDITABLE.contains(video.status())) {
            throw ApiException.conflict("Video " + code + " is " + video.status().toLowerCase().replace('_', ' ') + " and can no longer be changed.");
        }
        return video;
    }

    private FileRow uploading(VideoRow video) {
        return videos.file(video.id(), "ORIGINAL")
                .filter(f -> "UPLOADING".equals(f.status()) && f.uploadId() != null)
                .orElseThrow(() -> new ApiException(HttpStatus.GONE, "There is no upload in progress for this video. Please start again."));
    }

    private void requireCategory(long categoryId) {
        if (!videos.categoryExists(categoryId)) {
            throw ApiException.badRequest("Unknown category.");
        }
    }

    private static int partCount(long size) {
        return (int) Math.max(1, (size + PART_SIZE - 1) / PART_SIZE);
    }

    private static UploadSession session(String uploadId, String fileName, long size, List<UploadedPart> parts) {
        return new UploadSession(uploadId, fileName, size, PART_SIZE, partCount(size), parts);
    }

    private VideoDto toDto(VideoRow v) {
        FileInfo original = videos.file(v.id(), "ORIGINAL")
                .map(f -> new FileInfo(f.fileName(), f.sizeBytes(), f.status()))
                .orElse(null);
        String thumbnailUrl = storage.isConfigured()
                ? videos.file(v.id(), "THUMBNAIL").map(f -> storage.presignGet(f.storageKey(), null)).orElse(null)
                : null;
        String rejection = "REJECTED".equals(v.status()) ? videos.latestRejectionReason(v.id()).orElse(null) : null;
        return new VideoDto(v.code(), v.title(), v.description(), v.categoryId(), v.category(), v.tags(), v.status(),
                v.durationSec(), v.views(), v.thumbColor(), thumbnailUrl, v.createdAt(), v.submittedAt(), rejection, original);
    }
}
