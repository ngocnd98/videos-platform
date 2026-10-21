package com.pulsemedia.hub.video;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.video.VideoDtos.Category;
import com.pulsemedia.hub.video.VideoDtos.VideoMetadata;

@Repository
public class VideoRepository {

    /** Row shape shared by the creator endpoints. */
    public record VideoRow(long id, String code, long creatorId, String title, String description, Long categoryId,
                           String category, String tags, String status, Integer durationSec, long views,
                           String thumbColor, String createdAt, String submittedAt) {
    }

    public record FileRow(long id, long videoId, String kind, String storageKey, String fileName, Long sizeBytes,
                          String contentType, String uploadId, String status) {
    }

    private static final String SELECT_VIDEO = """
            SELECT v.id, v.code, v.creator_id, v.title, v.description, v.category_id, c.name AS category, v.tags,
                   v.status, v.duration_sec, v.views, v.thumb_color, v.created_at, v.submitted_at
            FROM videos v LEFT JOIN categories c ON c.id = v.category_id
            """;

    // Gradients used for placeholder thumbnails, matching the prototype palette.
    private static final List<String> THUMB_COLORS = List.of(
            "from-orange-200 to-rose-300", "from-amber-200 to-orange-300", "from-violet-200 to-indigo-300",
            "from-sky-200 to-cyan-300", "from-teal-200 to-emerald-300", "from-rose-200 to-pink-300",
            "from-indigo-200 to-fuchsia-300");

    private final JdbcClient jdbc;

    public VideoRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Category> categories() {
        return jdbc.sql("SELECT id, name FROM categories ORDER BY name").query(Category.class).list();
    }

    public boolean categoryExists(long id) {
        return jdbc.sql("SELECT count(*) FROM categories WHERE id = ?").param(id).query(Integer.class).single() > 0;
    }

    public Optional<VideoRow> findByCode(String code) {
        return jdbc.sql(SELECT_VIDEO + " WHERE v.code = ?").param(code).query(VideoRow.class).optional();
    }

    public List<VideoRow> listByCreator(long creatorId, String status) {
        String sql = SELECT_VIDEO + " WHERE v.creator_id = :creator"
                + (status == null ? "" : " AND v.status = :status")
                + " ORDER BY v.created_at DESC, v.id DESC";
        var spec = jdbc.sql(sql).param("creator", creatorId);
        if (status != null) {
            spec = spec.param("status", status);
        }
        return spec.query(VideoRow.class).list();
    }

    /** Creates a DRAFT with the next sequential code (V-2409, V-2410, ...). */
    public String createDraft(long creatorId, VideoMetadata m) {
        int next = jdbc.sql("SELECT coalesce(max(CAST(substr(code, 3) AS INTEGER)), 2400) + 1 FROM videos")
                .query(Integer.class).single();
        String code = "V-" + next;
        String color = THUMB_COLORS.get(next % THUMB_COLORS.size());
        jdbc.sql("""
                        INSERT INTO videos (code, creator_id, title, description, category_id, tags, status, duration_sec, thumb_color)
                        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
                        """)
                .params(code, creatorId, m.title().trim(), blankToNull(m.description()), m.categoryId(),
                        normalizeTags(m.tags()), m.durationSec(), color)
                .update();
        return code;
    }

    public void updateMetadata(long videoId, VideoMetadata m) {
        jdbc.sql("""
                        UPDATE videos SET title = ?, description = ?, category_id = ?, tags = ?,
                               duration_sec = coalesce(?, duration_sec),
                               updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                        WHERE id = ?
                        """)
                .params(m.title().trim(), blankToNull(m.description()), m.categoryId(), normalizeTags(m.tags()),
                        m.durationSec(), videoId)
                .update();
    }

    public void markSubmitted(long videoId) {
        jdbc.sql("""
                        UPDATE videos SET status = 'IN_REVIEW',
                               submitted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                               updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                        WHERE id = ?
                        """)
                .param(videoId).update();
    }

    public void delete(long videoId) {
        jdbc.sql("DELETE FROM video_files WHERE video_id = ?").param(videoId).update();
        jdbc.sql("DELETE FROM videos WHERE id = ?").param(videoId).update();
    }

    public void insertReviewLog(long videoId, String action, long actorId) {
        jdbc.sql("INSERT INTO review_logs (video_id, action, actor_id) VALUES (?, ?, ?)")
                .params(videoId, action, actorId).update();
    }

    public Optional<String> latestRejectionReason(long videoId) {
        return jdbc.sql("""
                        SELECT trim(coalesce(reason, '') || CASE WHEN note IS NOT NULL THEN ' · ' || note ELSE '' END)
                        FROM review_logs WHERE video_id = ? AND action = 'REJECTED'
                        ORDER BY created_at DESC, id DESC LIMIT 1
                        """)
                .param(videoId).query(String.class).optional();
    }

    // --- Files ---------------------------------------------------------------------------

    private static final String SELECT_FILE = """
            SELECT id, video_id, kind, storage_key, file_name, size_bytes, content_type, upload_id, status FROM video_files
            """;

    public Optional<FileRow> file(long videoId, String kind) {
        return jdbc.sql(SELECT_FILE + " WHERE video_id = ? AND kind = ? ORDER BY id DESC LIMIT 1")
                .params(videoId, kind).query(FileRow.class).optional();
    }

    public void deleteFiles(long videoId, String kind) {
        jdbc.sql("DELETE FROM video_files WHERE video_id = ? AND kind = ?").params(videoId, kind).update();
    }

    public void insertUploadingOriginal(long videoId, String key, String fileName, long size, String contentType, String uploadId) {
        jdbc.sql("""
                        INSERT INTO video_files (video_id, kind, storage_key, file_name, size_bytes, content_type, upload_id, status)
                        VALUES (?, 'ORIGINAL', ?, ?, ?, ?, ?, 'UPLOADING')
                        """)
                .params(videoId, key, fileName, size, contentType, uploadId).update();
    }

    public void markFileAvailable(long fileId) {
        jdbc.sql("UPDATE video_files SET status = 'AVAILABLE', upload_id = NULL WHERE id = ?").param(fileId).update();
    }

    public void insertThumbnail(long videoId, String key, long size, String contentType) {
        jdbc.sql("""
                        INSERT INTO video_files (video_id, kind, storage_key, file_name, size_bytes, content_type, status)
                        VALUES (?, 'THUMBNAIL', ?, 'thumbnail.jpg', ?, ?, 'AVAILABLE')
                        """)
                .params(videoId, key, size, contentType).update();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String normalizeTags(String tags) {
        if (tags == null) {
            return null;
        }
        String joined = String.join(",", java.util.Arrays.stream(tags.split(","))
                .map(String::trim).filter(t -> !t.isEmpty()).distinct().toList());
        return joined.isEmpty() ? null : joined;
    }
}
