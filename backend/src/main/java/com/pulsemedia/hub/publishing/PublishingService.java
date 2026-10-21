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
import com.pulsemedia.hub.publishing.PublishingDtos.Publication;
import com.pulsemedia.hub.publishing.PublishingDtos.PublicationInput;
import com.pulsemedia.hub.publishing.PublishingDtos.PublicationUpdate;
import com.pulsemedia.hub.publishing.PublishingDtos.PublishRequest;
import com.pulsemedia.hub.publishing.PublishingDtos.PublishingVideo;
import com.pulsemedia.hub.publishing.PublishingRepository.ExportRow;
import com.pulsemedia.hub.publishing.PublishingRepository.LinkRow;
import com.pulsemedia.hub.publishing.PublishingRepository.PublicationRow;
import com.pulsemedia.hub.publishing.PublishingRepository.VideoRow;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.settings.SettingsService;
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
    private static final Set<String> PUBLICATION_STATUSES = Set.of("PUBLISHED", "REMOVED", "NEEDS_ATTENTION");

    private final AuditLog audit;
    private final SettingsService settings;

    public PublishingService(PublishingRepository repo, ObjectStorage storage, AuditLog audit, SettingsService settings) {
        this.repo = repo;
        this.storage = storage;
        this.audit = audit;
        this.settings = settings;
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
            settings.requireEnabled(p.platform());
            if (!seen.add(p.platform())) {
                errors.add(p.platform() + " is listed twice");
            } else if (!PlatformUrls.isValid(p.platform(), p.url())) {
                errors.add("Enter a valid " + p.platform() + " URL");
            }
        }
        if (!errors.isEmpty()) {
            throw ApiException.badRequest(String.join("; ", errors) + ".");
        }
        String note = blankToNull(req.note());
        String channel = blankToNull(req.channel());
        for (PublicationInput p : req.publications()) {
            long platformId = repo.platformId(p.platform())
                    .orElseThrow(() -> ApiException.badRequest("Unknown platform " + p.platform()));
            if (repo.urlUsedElsewhere(p.url().trim(), v.id(), platformId)) {
                throw ApiException.conflict("This published URL is already recorded.");
            }
            repo.upsertPublication(v.id(), platformId, p.url().trim(), channel, note, admin.id());
        }
        repo.markPublished(v.id());
        String platforms = req.publications().stream().map(PublicationInput::platform).collect(Collectors.joining(", "));
        audit.record("VIDEO", v.code(), v.title(), "Published", "Published to " + platforms
                + (channel == null ? "" : " · " + channel) + (note == null ? "" : " · " + note), admin.id());
        VideoRow updated = find(code);
        return toDto(updated, repo.links(List.of(updated.id())));
    }

    public List<Publication> publications() {
        return repo.publications().stream().map(this::toPublication).toList();
    }

    public List<Publication> creatorPublications(long creatorId) {
        return repo.creatorPublications(creatorId).stream().map(this::toPublication).toList();
    }

    /** Corrects a single platform link: channel, URL, status (e.g. removed by the platform) and note. */
    @Transactional
    public Publication updatePublication(CurrentUser admin, long id, PublicationUpdate req) {
        PublicationRow row = repo.publication(id).orElseThrow(() -> ApiException.notFound("Publication not found."));
        if (!PUBLICATION_STATUSES.contains(req.status())) {
            throw ApiException.badRequest("status must be PUBLISHED, REMOVED or NEEDS_ATTENTION.");
        }
        String url = req.url().trim();
        if (!PlatformUrls.isValid(row.platform(), url)) {
            throw ApiException.badRequest("Enter a valid " + row.platform() + " URL.");
        }
        long platformId = repo.platformId(row.platform()).orElseThrow();
        if (repo.urlUsedElsewhere(url, row.videoId(), platformId)) {
            throw ApiException.conflict("This published URL is already recorded.");
        }
        repo.updatePublication(id, blankToNull(req.channel()), url, req.status(), blankToNull(req.note()));
        PublicationRow updated = repo.publication(id).orElseThrow();
        audit.record("VIDEO", updated.code(), updated.title(), "Publication updated",
                updated.platform() + " · " + (updated.channel() == null ? "No channel" : updated.channel()) + " · "
                        + updated.status().charAt(0) + updated.status().substring(1).toLowerCase().replace('_', ' '), admin.id());
        return toPublication(updated);
    }

    public String exportCsv() {
        StringBuilder csv = new StringBuilder("Video ID,Title,Creator,Platform,Channel,Status,URL,Published at,Published by,Note\n");
        for (ExportRow r : repo.export()) {
            csv.append(String.join(",", cell(r.code()), cell(r.title()), cell(r.creator()), cell(r.platform()),
                    cell(r.channel()), cell(r.status()), cell(r.url()), cell(r.publishedAt()), cell(r.publishedBy()),
                    cell(r.note()))).append('\n');
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
                links.stream().map(l -> new PlatformLink(l.id(), l.platform(), l.url(), l.channel(), l.status(), l.note(),
                        l.publishedAt())).toList());
    }

    private Publication toPublication(PublicationRow r) {
        String thumb = r.thumbnailKey() != null && storage.isConfigured() ? storage.presignGet(r.thumbnailKey(), null) : null;
        return new Publication(r.id(), r.code(), r.title(), r.creator(), r.platform(), r.channel(), r.url(), r.note(),
                r.status(), r.publishedAt(), r.thumbColor(), thumb);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
