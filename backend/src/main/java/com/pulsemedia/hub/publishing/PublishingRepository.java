package com.pulsemedia.hub.publishing;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.publishing.PublishingDtos.PlatformSummary;

@Repository
public class PublishingRepository {

    public record VideoRow(long id, String code, String title, String creator, String status, String thumbColor,
                           String thumbnailKey, String originalKey, String originalName, String approvedAt,
                           String firstPublishedAt) {
    }

    public record LinkRow(long id, long videoId, String platform, String url, String channel, String status, String note,
                          String publishedAt) {
    }

    public record PublicationRow(long id, long videoId, String code, String title, String creator, String platform,
                                 String channel, String url, String note, String status, String publishedAt,
                                 String thumbColor, String thumbnailKey) {
    }

    private static final String SELECT_PUBLICATION = """
            SELECT vp.id, vp.video_id, v.code, v.title, u.display_name AS creator, p.name AS platform, vp.channel, vp.url,
                   vp.note, vp.status, vp.published_at, v.thumb_color,
                   (SELECT storage_key FROM video_files WHERE video_id = v.id AND kind = 'THUMBNAIL' ORDER BY id DESC LIMIT 1) AS thumbnail_key
            FROM video_publications vp
            JOIN videos v ON v.id = vp.video_id
            JOIN platforms p ON p.id = vp.platform_id
            JOIN creator_profiles cp ON cp.id = v.creator_id
            JOIN users u ON u.id = cp.user_id
            """;
    private static final String PUBLICATION_ORDER = " ORDER BY vp.published_at DESC, vp.id DESC";

    public record ExportRow(String code, String title, String creator, String platform, String channel, String status,
                            String url, String note,
                            String publishedAt, String publishedBy) {
    }

    private static final String SELECT = """
            SELECT v.id, v.code, v.title, u.display_name AS creator, v.status, v.thumb_color,
                   t.storage_key AS thumbnail_key, o.storage_key AS original_key, o.file_name AS original_name,
                   (SELECT max(created_at) FROM review_logs r WHERE r.video_id = v.id AND r.action = 'APPROVED') AS approved_at,
                   v.first_published_at
            FROM videos v
            JOIN creator_profiles cp ON cp.id = v.creator_id
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN video_files o ON o.id = (SELECT max(id) FROM video_files
                                               WHERE video_id = v.id AND kind = 'ORIGINAL' AND status = 'AVAILABLE')
            LEFT JOIN video_files t ON t.id = (SELECT max(id) FROM video_files WHERE video_id = v.id AND kind = 'THUMBNAIL')
            """;

    private final JdbcClient jdbc;

    public PublishingRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<VideoRow> videos(String status) {
        return jdbc.sql(SELECT + " WHERE v.status = ? ORDER BY coalesce(v.first_published_at, v.updated_at) DESC, v.id DESC")
                .param(status).query(VideoRow.class).list();
    }

    public Optional<VideoRow> find(String code) {
        return jdbc.sql(SELECT + " WHERE v.code = ?").param(code).query(VideoRow.class).optional();
    }

    public List<LinkRow> links(List<Long> videoIds) {
        if (videoIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                        SELECT vp.id, vp.video_id, p.name AS platform, vp.url, vp.channel, vp.status, vp.note, vp.published_at
                        FROM video_publications vp JOIN platforms p ON p.id = vp.platform_id
                        WHERE vp.video_id IN (:ids)
                        ORDER BY p.id
                        """)
                .param("ids", videoIds).query(LinkRow.class).list();
    }

    public Optional<Long> platformId(String name) {
        return jdbc.sql("SELECT id FROM platforms WHERE name = ?").param(name).query(Long.class).optional();
    }

    /** One record per video and platform; recording the same platform again corrects its link. */
    public void upsertPublication(long videoId, long platformId, String url, String channel, String note, long actorId) {
        jdbc.sql("""
                        INSERT INTO video_publications (video_id, platform_id, url, channel, note, published_by)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT (video_id, platform_id) DO UPDATE SET url = excluded.url, channel = excluded.channel,
                            note = excluded.note, status = 'PUBLISHED', published_by = excluded.published_by
                        """)
                .params(videoId, platformId, url, channel, note, actorId).update();
    }

    /** True when another publication row (not the given video/platform pair) already uses this URL. */
    public boolean urlUsedElsewhere(String url, long videoId, long platformId) {
        return jdbc.sql("""
                        SELECT count(*) FROM video_publications
                        WHERE lower(url) = lower(?) AND NOT (video_id = ? AND platform_id = ?)
                        """)
                .params(url, videoId, platformId).query(Integer.class).single() > 0;
    }

    public List<PublicationRow> publications() {
        return jdbc.sql(SELECT_PUBLICATION + PUBLICATION_ORDER).query(PublicationRow.class).list();
    }

    public List<PublicationRow> creatorPublications(long creatorId) {
        return jdbc.sql(SELECT_PUBLICATION + " WHERE v.creator_id = ?" + PUBLICATION_ORDER).param(creatorId)
                .query(PublicationRow.class).list();
    }

    public Optional<PublicationRow> publication(long id) {
        return jdbc.sql(SELECT_PUBLICATION + " WHERE vp.id = ?").param(id).query(PublicationRow.class).optional();
    }

    public void updatePublication(long id, String channel, String url, String status, String note) {
        jdbc.sql("UPDATE video_publications SET channel = ?, url = ?, status = ?, note = ? WHERE id = ?")
                .params(channel, url, status, note, id).update();
    }

    public void markPublished(long videoId) {
        jdbc.sql("""
                        UPDATE videos SET status = 'PUBLISHED',
                               first_published_at = coalesce(first_published_at, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                               updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                        WHERE id = ?
                        """)
                .param(videoId).update();
    }

    public List<PlatformSummary> summary() {
        return jdbc.sql("""
                        SELECT p.name AS platform, count(DISTINCT vp.video_id) AS videos, coalesce(sum(v.views), 0) AS views
                        FROM platforms p
                        LEFT JOIN video_publications vp ON vp.platform_id = p.id
                        LEFT JOIN videos v ON v.id = vp.video_id
                        GROUP BY p.id ORDER BY p.id
                        """)
                .query(PlatformSummary.class).list();
    }

    public List<ExportRow> export() {
        return jdbc.sql("""
                        SELECT v.code, v.title, cu.display_name AS creator, p.name AS platform, vp.channel, vp.status, vp.url, vp.note,
                               vp.published_at, au.display_name AS published_by
                        FROM video_publications vp
                        JOIN videos v ON v.id = vp.video_id
                        JOIN platforms p ON p.id = vp.platform_id
                        JOIN creator_profiles cp ON cp.id = v.creator_id
                        JOIN users cu ON cu.id = cp.user_id
                        LEFT JOIN users au ON au.id = vp.published_by
                        ORDER BY vp.published_at DESC, vp.id DESC
                        """)
                .query(ExportRow.class).list();
    }
}
