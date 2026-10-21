-- Core schema, trimmed from the ERD in docs/architecture.md (section 6.5).
-- Money is stored as integer cents. Timestamps are ISO-8601 UTC text.

CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('ADMIN', 'CREATOR')),
    staff_role    TEXT             CHECK (staff_role IN ('SUPERADMIN', 'MODERATOR', 'FINANCE')),
    display_name  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE creator_profiles (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL UNIQUE REFERENCES users (id),
    slug              TEXT    NOT NULL UNIQUE,
    bio               TEXT,
    country           TEXT,
    payout_method     TEXT,
    revenue_share_pct REAL    NOT NULL DEFAULT 60,
    contract_signed_at TEXT
);

CREATE TABLE categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE platforms (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE videos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    code               TEXT    NOT NULL UNIQUE,
    creator_id         INTEGER NOT NULL REFERENCES creator_profiles (id),
    title              TEXT    NOT NULL,
    description        TEXT,
    category_id        INTEGER REFERENCES categories (id),
    tags               TEXT,
    status             TEXT    NOT NULL DEFAULT 'DRAFT'
                               CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED')),
    duration_sec       INTEGER,
    thumb_color        TEXT,
    views              INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    submitted_at       TEXT,
    first_published_at TEXT
);
CREATE INDEX idx_videos_creator_status ON videos (creator_id, status);
CREATE INDEX idx_videos_status ON videos (status);

CREATE TABLE video_files (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id     INTEGER NOT NULL REFERENCES videos (id),
    kind         TEXT    NOT NULL CHECK (kind IN ('ORIGINAL', 'THUMBNAIL')),
    storage_key  TEXT    NOT NULL,
    file_name    TEXT,
    size_bytes   INTEGER,
    content_type TEXT,
    upload_id    TEXT,
    status       TEXT    NOT NULL CHECK (status IN ('UPLOADING', 'AVAILABLE')),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_video_files_video ON video_files (video_id, kind);

CREATE TABLE review_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id   INTEGER NOT NULL REFERENCES videos (id),
    action     TEXT    NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    reason     TEXT,
    note       TEXT,
    actor_id   INTEGER REFERENCES users (id),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE video_publications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id     INTEGER NOT NULL REFERENCES videos (id),
    platform_id  INTEGER NOT NULL REFERENCES platforms (id),
    url          TEXT    NOT NULL,
    note         TEXT,
    published_by INTEGER REFERENCES users (id),
    published_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (video_id, platform_id)
);

CREATE TABLE payouts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id   INTEGER NOT NULL REFERENCES creator_profiles (id),
    amount_cents INTEGER NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    external_ref TEXT,
    remarks      TEXT,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    paid_at      TEXT
);

CREATE TABLE revenue_entries (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id            INTEGER NOT NULL REFERENCES videos (id),
    platform_id         INTEGER NOT NULL REFERENCES platforms (id),
    period_month        TEXT    NOT NULL, -- YYYY-MM
    gross_cents         INTEGER NOT NULL CHECK (gross_cents >= 0),
    currency            TEXT    NOT NULL DEFAULT 'USD',
    -- Snapshot of creator_profiles.revenue_share_pct at entry time, so later contract changes don't rewrite history.
    split_pct           REAL    NOT NULL,
    creator_share_cents INTEGER NOT NULL,
    payout_id           INTEGER REFERENCES payouts (id),
    created_by          INTEGER REFERENCES users (id),
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_revenue_video ON revenue_entries (video_id);
CREATE INDEX idx_revenue_payout ON revenue_entries (payout_id);

CREATE TABLE audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    entity     TEXT NOT NULL,
    entity_id  TEXT NOT NULL,
    title      TEXT,
    action     TEXT NOT NULL,
    detail     TEXT,
    actor_id   INTEGER REFERENCES users (id),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_audit_created ON audit_logs (created_at);
