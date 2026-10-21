package com.pulsemedia.hub.revenue;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.revenue.RevenueDtos.CreatorBalance;
import com.pulsemedia.hub.revenue.RevenueDtos.Payout;
import com.pulsemedia.hub.revenue.RevenueDtos.RevenueEntry;

@Repository
public class RevenueRepository {

    public record PublishedOn(long videoId, String code, String title, long creatorId, double splitPct, long platformId) {
    }

    public record CreatorInfo(long id, String name, String creatorCode, String country, String payoutMethod) {
    }

    private static final String SELECT_ENTRY = """
            SELECT r.id, v.code AS video_code, v.title AS video_title, u.display_name AS creator, v.creator_id,
                   p.name AS platform, r.period_month AS period, r.gross_cents, r.split_pct, r.creator_share_cents,
                   CASE WHEN po.status = 'PAID' THEN 'PAID' ELSE 'PENDING' END AS status, r.payout_id
            FROM revenue_entries r
            JOIN videos v ON v.id = r.video_id
            JOIN platforms p ON p.id = r.platform_id
            JOIN creator_profiles cp ON cp.id = v.creator_id
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN payouts po ON po.id = r.payout_id
            """;

    private final JdbcClient jdbc;

    public RevenueRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<RevenueEntry> entries(String period) {
        String where = period == null ? "" : " WHERE r.period_month = :period";
        var spec = jdbc.sql(SELECT_ENTRY + where + " ORDER BY r.period_month DESC, r.created_at DESC, r.id DESC");
        if (period != null) {
            spec = spec.param("period", period);
        }
        return spec.query(RevenueEntry.class).list();
    }

    public List<RevenueEntry> creatorEntries(long creatorId, String period) {
        return jdbc.sql(SELECT_ENTRY + " WHERE v.creator_id = ? AND r.period_month = ? ORDER BY v.title, p.id")
                .params(creatorId, period).query(RevenueEntry.class).list();
    }

    public Optional<RevenueEntry> entry(long id) {
        return jdbc.sql(SELECT_ENTRY + " WHERE r.id = ?").param(id).query(RevenueEntry.class).optional();
    }

    public List<String> periods() {
        return jdbc.sql("SELECT DISTINCT period_month FROM revenue_entries ORDER BY period_month DESC").query(String.class).list();
    }

    /** The video must be live on the platform: revenue is earned by a publication. */
    public Optional<PublishedOn> publishedOn(String code, String platform) {
        return jdbc.sql("""
                        SELECT v.id AS video_id, v.code, v.title, v.creator_id, cp.revenue_share_pct AS split_pct, p.id AS platform_id
                        FROM videos v
                        JOIN creator_profiles cp ON cp.id = v.creator_id
                        JOIN video_publications vp ON vp.video_id = v.id
                        JOIN platforms p ON p.id = vp.platform_id
                        WHERE v.code = ? AND p.name = ?
                        """)
                .params(code, platform).query(PublishedOn.class).optional();
    }

    /** Video codes whose title matches exactly (case-insensitive), for CSV rows without a Video ID. */
    public List<String> codesByTitle(String title) {
        return jdbc.sql("SELECT code FROM videos WHERE lower(title) = lower(?) AND status = 'PUBLISHED'")
                .param(title.trim()).query(String.class).list();
    }

    public boolean exists(long videoId, long platformId, String period) {
        return jdbc.sql("SELECT count(*) FROM revenue_entries WHERE video_id = ? AND platform_id = ? AND period_month = ?")
                .params(videoId, platformId, period).query(Integer.class).single() > 0;
    }

    public long insert(PublishedOn target, String period, long grossCents, long shareCents, long actorId) {
        jdbc.sql("""
                        INSERT INTO revenue_entries (video_id, platform_id, period_month, gross_cents, split_pct, creator_share_cents, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """)
                .params(target.videoId(), target.platformId(), period, grossCents, target.splitPct(), shareCents, actorId)
                .update();
        return jdbc.sql("SELECT last_insert_rowid()").query(Long.class).single();
    }

    public void updateGross(long id, long grossCents, long shareCents) {
        jdbc.sql("UPDATE revenue_entries SET gross_cents = ?, creator_share_cents = ? WHERE id = ?")
                .params(grossCents, shareCents, id).update();
    }

    public void delete(long id) {
        jdbc.sql("DELETE FROM revenue_entries WHERE id = ?").param(id).update();
    }

    // --- Payouts -------------------------------------------------------------------------

    public List<CreatorBalance> balances() {
        return jdbc.sql("""
                        SELECT cp.id AS creator_id, u.display_name AS creator, printf('PM-CR-%04d', cp.id) AS creator_code,
                               cp.payout_method, count(r.id) AS entries, coalesce(sum(r.creator_share_cents), 0) AS pending_cents
                        FROM creator_profiles cp
                        JOIN users u ON u.id = cp.user_id
                        LEFT JOIN videos v ON v.creator_id = cp.id
                        LEFT JOIN revenue_entries r ON r.video_id = v.id AND r.payout_id IS NULL
                        GROUP BY cp.id ORDER BY pending_cents DESC, u.display_name
                        """)
                .query(CreatorBalance.class).list();
    }

    public List<Payout> payouts(int limit) {
        return jdbc.sql("""
                        SELECT po.id, po.creator_id, u.display_name AS creator, po.amount_cents, po.status, po.external_ref,
                               po.remarks, po.paid_at, (SELECT count(*) FROM revenue_entries r WHERE r.payout_id = po.id) AS entries
                        FROM payouts po
                        JOIN creator_profiles cp ON cp.id = po.creator_id
                        JOIN users u ON u.id = cp.user_id
                        ORDER BY coalesce(po.paid_at, po.created_at) DESC, po.id DESC
                        LIMIT ?
                        """)
                .param(limit).query(Payout.class).list();
    }

    public Optional<Payout> payout(long id) {
        return payouts(10_000).stream().filter(p -> p.id() == id).findFirst();
    }

    /** Settles every unpaid entry of the creator in one PAID payout. Returns the payout id, or empty if nothing is owed. */
    public Optional<Long> settle(long creatorId, String externalRef, String remarks) {
        long amount = jdbc.sql("""
                        SELECT coalesce(sum(r.creator_share_cents), 0) FROM revenue_entries r JOIN videos v ON v.id = r.video_id
                        WHERE v.creator_id = ? AND r.payout_id IS NULL
                        """)
                .param(creatorId).query(Long.class).single();
        int count = jdbc.sql("""
                        SELECT count(*) FROM revenue_entries r JOIN videos v ON v.id = r.video_id
                        WHERE v.creator_id = ? AND r.payout_id IS NULL
                        """)
                .param(creatorId).query(Integer.class).single();
        if (count == 0) {
            return Optional.empty();
        }
        jdbc.sql("""
                        INSERT INTO payouts (creator_id, amount_cents, status, external_ref, remarks, paid_at)
                        VALUES (?, ?, 'PAID', ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                        """)
                .params(creatorId, amount, externalRef, remarks).update();
        long payoutId = jdbc.sql("SELECT last_insert_rowid()").query(Long.class).single();
        jdbc.sql("""
                        UPDATE revenue_entries SET payout_id = ?
                        WHERE payout_id IS NULL AND video_id IN (SELECT id FROM videos WHERE creator_id = ?)
                        """)
                .params(payoutId, creatorId).update();
        return Optional.of(payoutId);
    }

    public Optional<CreatorInfo> creator(long creatorId) {
        return jdbc.sql("""
                        SELECT cp.id, u.display_name AS name, printf('PM-CR-%04d', cp.id) AS creator_code, cp.country, cp.payout_method
                        FROM creator_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.id = ?
                        """)
                .param(creatorId).query(CreatorInfo.class).optional();
    }
}
