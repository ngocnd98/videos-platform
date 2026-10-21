-- Prototype v1.06: account status, category visibility, platform settings, publication channel/status,
-- two-step payouts, CMS pages. SQLite can't alter existing CHECK constraints, so payout cancellation is
-- stored in cancelled_at and the API derives status 'CANCELLED' from it.

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED'));

ALTER TABLE creator_profiles ADD COLUMN public_hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE creator_profiles ADD COLUMN social_links TEXT;

ALTER TABLE categories ADD COLUMN visible INTEGER NOT NULL DEFAULT 1;

ALTER TABLE platforms ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;

ALTER TABLE videos ADD COLUMN language TEXT NOT NULL DEFAULT 'English';

ALTER TABLE video_publications ADD COLUMN channel TEXT;
ALTER TABLE video_publications ADD COLUMN status TEXT NOT NULL DEFAULT 'PUBLISHED'
    CHECK (status IN ('PUBLISHED', 'REMOVED', 'NEEDS_ATTENTION'));

ALTER TABLE payouts ADD COLUMN period_month TEXT;
ALTER TABLE payouts ADD COLUMN cancelled_at TEXT;

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE cms_pages (
    slug       TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- --- Seed ------------------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
    ('upload_limit_gb', '2'), ('storage_quota_gb', '300'), ('default_share_pct', '60'), ('retention_days', '90');

INSERT INTO cms_pages (slug, title, content, updated_at) VALUES
    ('terms', 'Terms of service',
        'By uploading content to PulseMedia Hub you confirm that you own it or have permission to share it. PulseMedia publishes approved videos on partner platforms and shares the resulting revenue according to your creator agreement.',
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 days')),
    ('privacy', 'Privacy policy',
        'We store your account details, uploaded videos and payout information only to operate the service. Original files are kept for the configured retention period and then deleted.',
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 days')),
    ('about', 'About PulseMedia',
        'PulseMedia is a creator network for short-form video. We review, publish and monetise your content across YouTube, TikTok and Instagram so you can focus on creating.',
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-24 days'));

INSERT INTO users (id, email, password_hash, role, staff_role, display_name, created_at) VALUES
    (5, 'ops@pulsemedia.demo', '$2y$10$L5mpHP4CErPNvzElh6d9g.hMCxQXRdlv81h5bXEgUi17bCpE/qZoq', 'ADMIN', 'MODERATOR', 'Sam Ortiz',
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-120 days'));

UPDATE creator_profiles SET social_links = '@alexrivers · Instagram, TikTok' WHERE id = 1;
UPDATE creator_profiles SET social_links = '@mayachen · TikTok, YouTube' WHERE id = 2;

UPDATE video_publications SET channel = CASE platform_id
    WHEN 1 THEN 'PulseMedia Main' WHEN 2 THEN 'PulseMedia Clips' ELSE 'PulseMedia Reels' END;

UPDATE payouts SET period_month = (SELECT max(r.period_month) FROM revenue_entries r WHERE r.payout_id = payouts.id);

-- Alex's current-month TikTok earnings are prepared for payout but not yet transferred.
INSERT INTO payouts (id, creator_id, amount_cents, status, period_month, created_at) VALUES
    (16, 1, 80100, 'PENDING', strftime('%Y-%m', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'));
UPDATE revenue_entries SET payout_id = 16
WHERE period_month = strftime('%Y-%m', 'now') AND video_id IN (3, 5) AND payout_id IS NULL;
