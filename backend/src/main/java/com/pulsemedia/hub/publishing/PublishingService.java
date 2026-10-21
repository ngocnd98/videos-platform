package com.pulsemedia.hub.publishing;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.publishing.PublishingDtos.DownloadUrl;
import com.pulsemedia.hub.publishing.PublishingDtos.PlatformLink;
import com.pulsemedia.hub.publishing.PublishingDtos.PublicationInput;
import com.pulsemedia.hub.publishing.PublishingDtos.PublishRequest;
import com.pulsemedia.hub.publishing.PublishingDtos.PublishingVideo;
import com.pulsemedia.hub.publishing.PublishingRepository.ExportRow;
import com.pulsemedia.hub.publishing.PublishingRepository.LinkRow;
import com.pulsemedia.hub.publishing.PublishingRepository.VideoRow;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.storage.ObjectStorage;

/**
 * Admins download the original, publish it on YouTube/TikTok/Instagram by hand, then record the live
 * links here. There is no platform API integration (see docs/architecture.md, section 6.1).
 */
@Service
public class PublishingService {

    private static final Set<String> PUBLISHABLE = Set.of("APPROVED", "PUBLISHED");

    private final PublishingRepository repo;
    private final ObjectStorage storage;
    private final AuditLog audit;

    public PublishingService(PublishingRepository repo, ObjectStorage storage, AuditLog audit) {
        this.repo = repo;
        this.storage = storage;
        this.audit = audit;
    }

    public List<PublishingVideo> videos(String status) {
        if (!PUBLISHABLE.contains(status)) {
            throw ApiException.badRequest("status must be APPROVED or PUBLISHED");
        }
        List<VideoRow> rows = repo.videos(status);
        Map<Long, List<LinkRow>> links = repo.links(rows.stream().map(VideoRow::id).toList()).stream()
                .collect(Collectors.groupingBy(LinkRow::videoId));
        return rows.stream().map(r -> toDto(r, links.getOrDefault(r.id(), List.of()))).toList();
    }

    public DownloadUrl downloadUrl(String code) {
        VideoRow v = find(code);
        if (v.originalKey() == null) {
            throw ApiException.notFound("The original file for “" + v.title() + "” is no longer stored.");
        }
        String fileName = v.originalName() == null ? v.code() + ".mp4" : v.originalName();
        return new DownloadUrl(storage.presignGet(v.originalKey(), fileName), fileName);
    }

    @Transactional
    public PublishingVideo publish(CurrentUser admin, String code, PublishRequest req) {
        VideoRow v = find(code);
        if (!PUBLISHABLE.contains(v.status())) {
            throw ApiException.conflict("“" + v.title() + "” must be approved before it can be published.");
        }
        Set<String> seen = new HashSet<>();
        List<String> errors = new ArrayList<>();
        for (PublicationInput p : req.publications()) {
            if (!seen.add(p.platform())) {
                errors.add(p.platform() + " is listed twice");
            } else if (!PlatformUrls.isValid(p.platform(), p.url())) {
                errors.add("Enter a valid " + p.platform() + " URL");
            }
        }
        if (!errors.isEmpty()) {
            throw ApiException.badRequest(String.join("; ", errors) + ".");
        }
        String note = req.note() == null || req.note().isBlank() ? null : req.note().trim();
        for (PublicationInput p : req.publications()) {
            long platformId = repo.platformId(p.platform())
                    .orElseThrow(() -> ApiException.badRequest("Unknown platform " + p.platform()));
            repo.upsertPublication(v.id(), platformId, p.url().trim(), note, admin.id());
        }
        repo.markPublished(v.id());
        String platforms = req.publications().stream().map(PublicationInput::platform).collect(Collectors.joining(", "));
        audit.record("VIDEO", v.code(), v.title(), "Published", "Published to " + platforms + (note == null ? "" : " · " + note), admin.id());
        VideoRow updated = find(code);
        return toDto(updated, repo.links(List.of(updated.id())));
    }

    public String exportCsv() {
        StringBuilder csv = new StringBuilder("Video ID,Title,Creator,Platform,URL,Published at,Published by,Note\n");
        for (ExportRow r : repo.export()) {
            csv.append(String.join(",", cell(r.code()), cell(r.title()), cell(r.creator()), cell(r.platform()),
                    cell(r.url()), cell(r.publishedAt()), cell(r.publishedBy()), cell(r.note()))).append('\n');
        }
        return csv.toString();
    }

    private static String cell(String value) {
        if (value == null) {
            return "";
        }
        // Prefix formula-like values so spreadsheets don't evaluate them.
        String v = value.matches("^[=+\\-@].*") ? "'" + value : value;
        return v.contains(",") || v.contains("\"") || v.contains("\n") ? "\"" + v.replace("\"", "\"\"") + "\"" : v;
    }

    private VideoRow find(String code) {
        return repo.find(code).orElseThrow(() -> ApiException.notFound("Video " + code + " not found."));
    }

    private PublishingVideo toDto(VideoRow r, List<LinkRow> links) {
        String thumb = r.thumbnailKey() != null && storage.isConfigured() ? storage.presignGet(r.thumbnailKey(), null) : null;
        return new PublishingVideo(r.code(), r.title(), r.creator(), r.status(), r.thumbColor(), thumb,
                r.originalKey() != null, r.approvedAt(), r.firstPublishedAt(),
                links.stream().map(l -> new PlatformLink(l.platform(), l.url(), l.note(), l.publishedAt())).toList());
    }
}
