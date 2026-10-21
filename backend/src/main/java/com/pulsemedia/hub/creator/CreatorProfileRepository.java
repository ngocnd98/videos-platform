package com.pulsemedia.hub.creator;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.creator.CreatorProfileDtos.CreatorAccount;
import com.pulsemedia.hub.creator.CreatorProfileDtos.CreatorAccountUpdate;

@Repository
public class CreatorProfileRepository {

    /** A published video as shown on the public page, with the storage key of its thumbnail. */
    public record PublicVideoRow(String code, String title, String category, String description, String tags, long views,
                                 String platform, String url, String publishedAt, String thumbColor, String thumbnailKey) {
    }

    private final JdbcClient jdbc;

    public CreatorProfileRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public CreatorAccount account(long creatorId) {
        return jdbc.sql("""
                        SELECT u.display_name, u.email, printf('PM-CR-%04d', cp.id) AS creator_code, cp.slug, cp.country,
                               cp.bio, cp.social_links, cp.payout_method, cp.revenue_share_pct AS share_pct,
                               cp.contract_signed_at, u.status, cp.public_hidden
                        FROM creator_profiles cp JOIN users u ON u.id = cp.user_id
                        WHERE cp.id = ?
                        """)
                .param(creatorId).query(CreatorAccount.class).single();
    }

    public boolean slugTaken(String slug, long creatorId) {
        return jdbc.sql("SELECT count(*) FROM creator_profiles WHERE slug = ? AND id <> ?").params(slug, creatorId)
                .query(Integer.class).single() > 0;
    }

    public void update(long creatorId, long userId, CreatorAccountUpdate u, String slug) {
        jdbc.sql("UPDATE users SET display_name = ? WHERE id = ?").params(u.displayName().trim(), userId).update();
        jdbc.sql("""
                        UPDATE creator_profiles SET slug = ?, country = ?, bio = ?, social_links = ?, payout_method = ?
                        WHERE id = ?
                        """)
                .params(slug, blankToNull(u.country()), blankToNull(u.bio()), blankToNull(u.socialLinks()),
                        blankToNull(u.payoutMethod()), creatorId)
                .update();
    }

    public void updatePassword(long userId, String passwordHash) {
        jdbc.sql("UPDATE users SET password_hash = ? WHERE id = ?").params(passwordHash, userId).update();
    }

    /** Published videos with at least one live link; the link shown prefers YouTube, then TikTok, then Instagram. */
    public List<PublicVideoRow> publicVideos(long creatorId) {
        return jdbc.sql("""
                        SELECT v.code, v.title, c.name AS category, v.description, v.tags, v.views, p.name AS platform,
                               vp.url, vp.published_at, v.thumb_color,
                               (SELECT storage_key FROM video_files WHERE video_id = v.id AND kind = 'THUMBNAIL'
                                ORDER BY id DESC LIMIT 1) AS thumbnail_key
                        FROM videos v
                        LEFT JOIN categories c ON c.id = v.category_id
                        JOIN video_publications vp ON vp.id = (SELECT x.id FROM video_publications x
                                                               WHERE x.video_id = v.id AND x.status = 'PUBLISHED'
                                                               ORDER BY x.platform_id LIMIT 1)
                        JOIN platforms p ON p.id = vp.platform_id
                        WHERE v.creator_id = ? AND v.status = 'PUBLISHED'
                        ORDER BY coalesce(v.first_published_at, vp.published_at) DESC, v.id DESC
                        """)
                .param(creatorId).query(PublicVideoRow.class).list();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
