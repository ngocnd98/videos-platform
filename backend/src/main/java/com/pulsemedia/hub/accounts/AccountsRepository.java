package com.pulsemedia.hub.accounts;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.accounts.AccountsDtos.AdminCreator;
import com.pulsemedia.hub.accounts.AccountsDtos.CreatorVideoSummary;
import com.pulsemedia.hub.accounts.AccountsDtos.WorkspaceUser;

@Repository
public class AccountsRepository {

    private static final String SELECT_USER = """
            SELECT id, printf('USR-%03d', id) AS user_code, display_name AS name, email, role, staff_role, status
            FROM users
            """;

    private static final String SELECT_CREATOR = """
            SELECT cp.id AS creator_id, u.id AS user_id, printf('PM-CR-%04d', cp.id) AS creator_code,
                   u.display_name AS name, u.email, cp.country, cp.payout_method, cp.revenue_share_pct AS share_pct,
                   u.status, cp.public_hidden,
                   (SELECT count(*) FROM videos v WHERE v.creator_id = cp.id) AS videos,
                   (SELECT coalesce(sum(r.creator_share_cents), 0) FROM revenue_entries r JOIN videos v ON v.id = r.video_id
                    WHERE v.creator_id = cp.id AND r.payout_id IS NULL) AS unpaid_cents
            FROM creator_profiles cp JOIN users u ON u.id = cp.user_id
            """;

    private final JdbcClient jdbc;

    public AccountsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // --- Users ---------------------------------------------------------------------------

    public List<WorkspaceUser> users() {
        return jdbc.sql(SELECT_USER + " ORDER BY CASE role WHEN 'ADMIN' THEN 0 ELSE 1 END, display_name")
                .query(WorkspaceUser.class).list();
    }

    public Optional<WorkspaceUser> user(long id) {
        return jdbc.sql(SELECT_USER + " WHERE id = ?").param(id).query(WorkspaceUser.class).optional();
    }

    public boolean emailTaken(String email) {
        return jdbc.sql("SELECT count(*) FROM users WHERE lower(email) = lower(?)").param(email.trim())
                .query(Integer.class).single() > 0;
    }

    public long insertInvitedAdmin(String name, String email, String passwordHash) {
        jdbc.sql("""
                        INSERT INTO users (email, password_hash, role, staff_role, display_name, status)
                        VALUES (?, ?, 'ADMIN', 'MODERATOR', ?, 'INVITED')
                        """)
                .params(email.trim().toLowerCase(), passwordHash, name.trim()).update();
        return jdbc.sql("SELECT last_insert_rowid()").query(Long.class).single();
    }

    public int activeAdmins() {
        return jdbc.sql("SELECT count(*) FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'").query(Integer.class).single();
    }

    public void setStatus(long userId, String status) {
        jdbc.sql("UPDATE users SET status = ? WHERE id = ?").params(status, userId).update();
    }

    // --- Creators ------------------------------------------------------------------------

    public List<AdminCreator> creators() {
        return jdbc.sql(SELECT_CREATOR + " ORDER BY u.display_name").query(AdminCreator.class).list();
    }

    public Optional<AdminCreator> creator(long creatorId) {
        return jdbc.sql(SELECT_CREATOR + " WHERE cp.id = ?").param(creatorId).query(AdminCreator.class).optional();
    }

    public void setShare(long creatorId, double sharePct) {
        jdbc.sql("UPDATE creator_profiles SET revenue_share_pct = ? WHERE id = ?").params(sharePct, creatorId).update();
    }

    public void setPublicHidden(long creatorId, boolean hidden) {
        jdbc.sql("UPDATE creator_profiles SET public_hidden = ? WHERE id = ?").params(hidden ? 1 : 0, creatorId).update();
    }

    public List<CreatorVideoSummary> latestVideos(long creatorId, int limit) {
        return jdbc.sql("""
                        SELECT code, title, status, created_at FROM videos WHERE creator_id = ?
                        ORDER BY created_at DESC, id DESC LIMIT ?
                        """)
                .params(creatorId, limit).query(CreatorVideoSummary.class).list();
    }
}
