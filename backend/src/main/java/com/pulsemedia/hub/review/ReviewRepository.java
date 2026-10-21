package com.pulsemedia.hub.review;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.review.ReviewDtos.AuditEntry;

@Repository
public class ReviewRepository {

    public record ReviewRow(long id, String code, String title, String description, String tags, String status,
                            String creator, Long categoryId, String category, Integer durationSec, String thumbColor,
                            String submittedAt, String originalKey, String fileName, Long sizeBytes,
                            String thumbnailKey) {
    }

    private static final String SELECT = """
            SELECT v.id, v.code, v.title, v.description, v.tags, v.status, u.display_name AS creator,
                   v.category_id, c.name AS category, v.duration_sec, v.thumb_color, v.submitted_at,
                   o.storage_key AS original_key, o.file_name, o.size_bytes,
                   t.storage_key AS thumbnail_key
            FROM videos v
            JOIN creator_profiles cp ON cp.id = v.creator_id
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN categories c ON c.id = v.category_id
            LEFT JOIN video_files o ON o.id = (SELECT max(id) FROM video_files
                                               WHERE video_id = v.id AND kind = 'ORIGINAL' AND status = 'AVAILABLE')
            LEFT JOIN video_files t ON t.id = (SELECT max(id) FROM video_files
                                               WHERE video_id = v.id AND kind = 'THUMBNAIL')
            """;

    private final JdbcClient jdbc;

    public ReviewRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Oldest first, so the queue is worked in submission order. */
    public List<ReviewRow> queue() {
        return jdbc.sql(SELECT + " WHERE v.status = 'IN_REVIEW' ORDER BY v.submitted_at, v.id")
                .query(ReviewRow.class).list();
    }

    public Optional<ReviewRow> find(String code) {
        return jdbc.sql(SELECT + " WHERE v.code = ?").param(code).query(ReviewRow.class).optional();
    }

    /** Moves IN_REVIEW → newStatus. Returns false if another reviewer already decided. */
    public boolean decide(long videoId, String newStatus) {
        return jdbc.sql("""
                        UPDATE videos SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                        WHERE id = ? AND status = 'IN_REVIEW'
                        """)
                .params(newStatus, videoId).update() == 1;
    }

    public void log(long videoId, String action, String reason, String note, long actorId) {
        jdbc.sql("INSERT INTO review_logs (video_id, action, reason, note, actor_id) VALUES (?, ?, ?, ?, ?)")
                .params(videoId, action, reason, note, actorId).update();
    }

    public List<AuditEntry> audit(int limit) {
        return jdbc.sql("""
                        SELECT a.id, a.entity, a.entity_id, a.title, a.action, a.detail, u.display_name AS actor, a.created_at
                        FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
                        ORDER BY a.created_at DESC, a.id DESC
                        LIMIT ?
                        """)
                .param(limit).query(AuditEntry.class).list();
    }
}
