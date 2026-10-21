package com.pulsemedia.hub.dashboard;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.dashboard.DashboardDtos.CreatorProfile;
import com.pulsemedia.hub.dashboard.DashboardDtos.CreatorVideo;
import com.pulsemedia.hub.dashboard.DashboardDtos.MonthlyGross;
import com.pulsemedia.hub.dashboard.DashboardDtos.PublicationItem;
import com.pulsemedia.hub.dashboard.DashboardDtos.ReviewItem;

@Repository
public class DashboardRepository {

    private final JdbcClient jdbc;

    public DashboardRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private int count(String sql) {
        return jdbc.sql(sql).query(Integer.class).single();
    }

    private long sum(String sql, Object... params) {
        var spec = jdbc.sql(sql);
        for (Object p : params) {
            spec = spec.param(p);
        }
        Long value = spec.query(Long.class).single();
        return value == null ? 0 : value;
    }

    // --- Admin ---------------------------------------------------------------------------

    public int pendingReview() {
        return count("SELECT count(*) FROM videos WHERE status = 'IN_REVIEW'");
    }

    public int submittedToday() {
        return count("SELECT count(*) FROM videos WHERE status = 'IN_REVIEW' AND date(submitted_at) = date('now')");
    }

    public int publishedBetweenDaysAgo(int fromDaysAgo, int toDaysAgo) {
        return jdbc.sql("""
                        SELECT count(*) FROM video_publications
                        WHERE published_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
                          AND published_at <  strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
                        """)
                .param("-" + fromDaysAgo + " days")
                .param("-" + toDaysAgo + " days")
                .query(Integer.class).single();
    }

    public int platformCount() {
        return count("SELECT count(*) FROM platforms WHERE enabled = 1");
    }

    public int approvedUnpublished() {
        return count("SELECT count(*) FROM videos WHERE status = 'APPROVED'");
    }

    public int pendingPayouts() {
        return count("SELECT count(*) FROM payouts WHERE status = 'PENDING' AND cancelled_at IS NULL");
    }

    public long pendingPayoutsCents() {
        return sum("SELECT coalesce(sum(amount_cents), 0) FROM payouts WHERE status = 'PENDING' AND cancelled_at IS NULL");
    }

    public long storageUsedBytes() {
        return sum("SELECT coalesce(sum(size_bytes), 0) FROM video_files WHERE status = 'AVAILABLE'");
    }

    public long grossForMonth(String month) {
        return sum("SELECT coalesce(sum(gross_cents), 0) FROM revenue_entries WHERE period_month = ?", month);
    }

    public int activeCreators() {
        return count("SELECT count(*) FROM creator_profiles cp JOIN users u ON u.id = cp.user_id WHERE u.status = 'ACTIVE'");
    }

    public int creatorsJoinedThisMonth() {
        return count("""
                SELECT count(*) FROM users
                WHERE role = 'CREATOR' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
                """);
    }

    public List<ReviewItem> reviewQueue(int limit) {
        return jdbc.sql("""
                        SELECT v.code, v.title, u.display_name AS creator, c.name AS category, v.thumb_color,
                               v.duration_sec, v.submitted_at
                        FROM videos v
                        JOIN creator_profiles cp ON cp.id = v.creator_id
                        JOIN users u ON u.id = cp.user_id
                        LEFT JOIN categories c ON c.id = v.category_id
                        WHERE v.status = 'IN_REVIEW'
                        ORDER BY v.submitted_at DESC
                        LIMIT ?
                        """)
                .param(limit)
                .query(ReviewItem.class).list();
    }

    public List<MonthlyGross> grossByMonthSince(String fromMonth) {
        return jdbc.sql("""
                        SELECT period_month AS month, sum(gross_cents) AS gross_cents
                        FROM revenue_entries
                        WHERE period_month >= ?
                        GROUP BY period_month
                        ORDER BY period_month
                        """)
                .param(fromMonth)
                .query(MonthlyGross.class).list();
    }

    public List<PublicationItem> recentPublications(int limit) {
        return jdbc.sql("""
                        SELECT v.code, v.title, u.display_name AS creator, p.name AS platform, vp.url,
                               vp.channel, vp.status, v.thumb_color, vp.published_at
                        FROM video_publications vp
                        JOIN videos v ON v.id = vp.video_id
                        JOIN platforms p ON p.id = vp.platform_id
                        JOIN creator_profiles cp ON cp.id = v.creator_id
                        JOIN users u ON u.id = cp.user_id
                        ORDER BY vp.published_at DESC, vp.id DESC
                        LIMIT ?
                        """)
                .param(limit)
                .query(PublicationItem.class).list();
    }

    // --- Creator -------------------------------------------------------------------------

    public long totalViews(long creatorId) {
        return sum("SELECT coalesce(sum(views), 0) FROM videos WHERE creator_id = ?", creatorId);
    }

    public int publishedCount(long creatorId) {
        return jdbc.sql("SELECT count(*) FROM videos WHERE creator_id = ? AND status = 'PUBLISHED'")
                .param(creatorId).query(Integer.class).single();
    }

    public long totalEarnedCents(long creatorId) {
        return sum("""
                SELECT coalesce(sum(r.creator_share_cents), 0)
                FROM revenue_entries r JOIN videos v ON v.id = r.video_id
                WHERE v.creator_id = ?
                """, creatorId);
    }

    /** Creator share not yet covered by a PAID payout. */
    public long pendingPayoutCents(long creatorId) {
        return sum("""
                SELECT coalesce(sum(r.creator_share_cents), 0)
                FROM revenue_entries r
                JOIN videos v ON v.id = r.video_id
                LEFT JOIN payouts p ON p.id = r.payout_id
                WHERE v.creator_id = ? AND (p.id IS NULL OR p.status <> 'PAID')
                """, creatorId);
    }

    public List<CreatorVideo> latestVideos(long creatorId, int limit) {
        return jdbc.sql("""
                        SELECT v.code, v.title, c.name AS category, v.status, v.views, v.thumb_color, v.created_at
                        FROM videos v LEFT JOIN categories c ON c.id = v.category_id
                        WHERE v.creator_id = ?
                        ORDER BY v.created_at DESC
                        LIMIT ?
                        """)
                .param(creatorId)
                .param(limit)
                .query(CreatorVideo.class).list();
    }

    public CreatorProfile profile(long creatorId) {
        return jdbc.sql("""
                        SELECT u.display_name, printf('PM-CR-%04d', cp.id) AS creator_code, cp.slug, cp.country,
                               cp.payout_method, cp.revenue_share_pct AS split_pct, cp.contract_signed_at
                        FROM creator_profiles cp JOIN users u ON u.id = cp.user_id
                        WHERE cp.id = ?
                        """)
                .param(creatorId)
                .query(CreatorProfile.class).single();
    }
}
