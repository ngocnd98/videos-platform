package com.pulsemedia.hub.review;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.review.ReviewDtos.InfoCorrection;
import com.pulsemedia.hub.review.ReviewDtos.QueueItem;
import com.pulsemedia.hub.review.ReviewDtos.RejectRequest;
import com.pulsemedia.hub.review.ReviewDtos.ReviewDetail;
import com.pulsemedia.hub.review.ReviewRepository.ReviewRow;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.storage.ObjectStorage;
import com.pulsemedia.hub.video.VideoRepository;

@Service
public class ReviewService {

    /** Same options as the prototype's reject dialog; the reason is shown to the creator. */
    public static final List<String> REJECTION_REASONS = List.of(
            "Copyright or usage rights issue",
            "Low resolution or video quality",
            "Audio mismatch or sound issue",
            "Community guidelines",
            "Other");

    private final ReviewRepository reviews;
    private final ObjectStorage storage;
    private final AuditLog audit;
    private final VideoRepository videos;

    public ReviewService(ReviewRepository reviews, ObjectStorage storage, AuditLog audit, VideoRepository videos) {
        this.reviews = reviews;
        this.storage = storage;
        this.audit = audit;
        this.videos = videos;
    }

    public List<QueueItem> queue() {
        return reviews.queue().stream()
                .map(r -> new QueueItem(r.code(), r.title(), r.creator(), r.categoryId(), r.category(), r.durationSec(),
                        r.thumbColor(), presign(r.thumbnailKey()), r.submittedAt(), r.creatorCountry(), r.tags()))
                .toList();
    }

    public ReviewDetail detail(String code) {
        ReviewRow r = find(code);
        return new ReviewDetail(r.code(), r.title(), r.description(), r.tags(), r.status(), r.creator(), r.category(),
                r.durationSec(), r.thumbColor(), presign(r.thumbnailKey()), presign(r.originalKey()), r.fileName(),
                r.sizeBytes(), r.submittedAt());
    }

    @Transactional
    public ReviewDetail correctInfo(CurrentUser admin, String code, InfoCorrection req) {
        ReviewRow r = find(code);
        var category = videos.category(req.categoryId()).orElseThrow(() -> ApiException.badRequest("Unknown category."));
        if (VideoRepository.tagCount(req.tags()) > 10) {
            throw ApiException.badRequest("A video can have up to 10 tags.");
        }
        String tags = VideoRepository.normalizeTags(req.tags());
        if (!reviews.correctInfo(r.id(), req.title().trim(), category.id(), tags)) {
            throw ApiException.conflict("This video is no longer waiting for review.");
        }
        audit.record("VIDEO", r.code(), req.title().trim(), "Info corrected", "Category: " + category.name() + ".", admin.id());
        return detail(code);
    }

    @Transactional
    public void approve(CurrentUser admin, String code) {
        ReviewRow r = find(code);
        if (r.originalKey() == null) {
            throw ApiException.conflict("“" + r.title() + "” has no uploaded file to approve.");
        }
        transition(r, "APPROVED");
        reviews.log(r.id(), "APPROVED", null, null, admin.id());
        audit.record("VIDEO", r.code(), r.title(), "Approved", "Approved by " + admin.displayName(), admin.id());
    }

    @Transactional
    public void reject(CurrentUser admin, String code, RejectRequest req) {
        if (!REJECTION_REASONS.contains(req.reason())) {
            throw ApiException.badRequest("Choose one of the listed rejection reasons.");
        }
        String note = req.note() == null || req.note().isBlank() ? null : req.note().trim();
        ReviewRow r = find(code);
        transition(r, "REJECTED");
        reviews.log(r.id(), "REJECTED", req.reason(), note, admin.id());
        audit.record("VIDEO", r.code(), r.title(), "Rejected", req.reason() + (note == null ? "" : " · " + note), admin.id());
    }

    private void transition(ReviewRow r, String status) {
        if (!reviews.decide(r.id(), status)) {
            throw ApiException.conflict("“" + r.title() + "” is no longer waiting for review.");
        }
    }

    private ReviewRow find(String code) {
        return reviews.find(code).orElseThrow(() -> ApiException.notFound("Video " + code + " not found."));
    }

    private String presign(String key) {
        return key != null && storage.isConfigured() ? storage.presignGet(key, null) : null;
    }
}
