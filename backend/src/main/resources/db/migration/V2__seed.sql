-- Demo seed data, modelled on the prototype (prototype-v104.html).
-- Dates are relative to boot time so the demo always looks current.
-- All demo accounts use the password "demo1234".

INSERT INTO users (id, email, password_hash, role, staff_role, display_name, created_at) VALUES
    (1, 'admin@pulsemedia.demo',  '$2y$10$L5mpHP4CErPNvzElh6d9g.hMCxQXRdlv81h5bXEgUi17bCpE/qZoq', 'ADMIN',   'SUPERADMIN', 'Morgan Hale', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-300 days')),
    (2, 'alex@pulsemedia.demo',   '$2y$10$L5mpHP4CErPNvzElh6d9g.hMCxQXRdlv81h5bXEgUi17bCpE/qZoq', 'CREATOR', NULL,         'Alex Rivers', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-221 days')),
    (3, 'maya@pulsemedia.demo',   '$2y$10$L5mpHP4CErPNvzElh6d9g.hMCxQXRdlv81h5bXEgUi17bCpE/qZoq', 'CREATOR', NULL,         'Maya Chen',   strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-201 days')),
    (4, 'jordan@pulsemedia.demo', '$2y$10$L5mpHP4CErPNvzElh6d9g.hMCxQXRdlv81h5bXEgUi17bCpE/qZoq', 'CREATOR', NULL,         'Jordan Lee',  strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-211 days'));

INSERT INTO creator_profiles (id, user_id, slug, bio, country, payout_method, revenue_share_pct, contract_signed_at) VALUES
    (1, 2, 'alex-rivers', 'Short-form stories about city life, food and better routines.', 'US', 'PayPal · alex•••@mail.com', 60,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-220 days')),
    (2, 3, 'maya-chen',   'Coffee, food and travel in under a minute.',                    'SG', 'Bank transfer · DBS ••••4821', 60,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-200 days')),
    (3, 4, 'jordan-lee',  'Quick wellness breaks for busy people.',                         'VN', 'Bank transfer · VCB ••••0937', 60,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-210 days'));

INSERT INTO categories (id, name) VALUES
    (1, 'Lifestyle'), (2, 'Food'), (3, 'Education'), (4, 'Wellness'), (5, 'Travel'), (6, 'Tech');

INSERT INTO platforms (id, name) VALUES
    (1, 'YouTube'), (2, 'TikTok'), (3, 'Instagram');

INSERT INTO videos (id, code, creator_id, title, description, category_id, tags, status, duration_sec, thumb_color, views,
                    created_at, updated_at, submitted_at, first_published_at) VALUES
    (1, 'V-2408', 1, 'A morning in the city', 'Sunrise walk through downtown.', 1, 'city,morning', 'IN_REVIEW', 42,
        'from-orange-200 to-rose-300', 0,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 hours'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 hours'), NULL),
    (2, 'V-2407', 1, '3 recipes in 30 seconds', 'Three quick breakfast ideas.', 2, 'food,quick', 'APPROVED', 30,
        'from-amber-200 to-orange-300', 0,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 days'), NULL),
    (3, 'V-2406', 1, 'Weekend reset routine', 'How I reset my space every Sunday.', 1, 'routine,home', 'PUBLISHED', 55,
        'from-violet-200 to-indigo-300', 24800,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days')),
    (4, 'V-2405', 1, 'What I wish I knew at 20', NULL, 3, 'advice', 'DRAFT', NULL,
        'from-sky-200 to-cyan-300', 0,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 days'),
        NULL, NULL),
    (5, 'V-2402', 1, 'Five-minute pasta', 'Dinner faster than delivery.', 2, 'food,pasta', 'PUBLISHED', 48,
        'from-rose-200 to-pink-300', 18300,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-27 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-27 days')),
    (6, 'V-2398', 2, 'The perfect pour-over', 'Dial in your morning coffee.', 2, 'coffee', 'IN_REVIEW', 58,
        'from-amber-200 to-yellow-300', 0,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 hours'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 hours'), NULL),
    (7, 'V-2391', 3, 'One-minute desk stretch', 'Undo an afternoon of sitting.', 4, 'stretch,office', 'IN_REVIEW', 51,
        'from-teal-200 to-emerald-300', 0,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'), NULL),
    (8, 'V-2388', 2, 'Tokyo in 60 seconds', 'A minute of neon and noodles.', 5, 'travel,tokyo', 'PUBLISHED', 60,
        'from-sky-200 to-indigo-300', 61200,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-38 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-38 days')),
    (9, 'V-2380', 3, 'Morning mobility flow', 'Five moves before coffee.', 4, 'mobility', 'PUBLISHED', 45,
        'from-emerald-200 to-teal-300', 9700,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-43 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-43 days'));

-- Older catalogue that drives the six-month revenue history. Their original files were already
-- purged by the retention policy, so they have no video_files rows.
INSERT INTO videos (id, code, creator_id, title, description, category_id, tags, status, duration_sec, thumb_color, views,
                    created_at, updated_at, submitted_at, first_published_at) VALUES
    (10, 'V-2310', 2, 'Street food in Hanoi', 'Six dishes, one alley.', 5, 'travel,food', 'PUBLISHED', 59,
        'from-orange-200 to-amber-300', 132400,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-175 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-170 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-175 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-170 days')),
    (11, 'V-2295', 3, 'Fix your posture in 45s', 'Three cues for a better desk day.', 4, 'posture', 'PUBLISHED', 45,
        'from-cyan-200 to-sky-300', 87600,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-182 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-178 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-182 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-178 days')),
    (12, 'V-2302', 1, 'Budget travel hacks', 'Spend less, see more.', 5, 'travel,budget', 'PUBLISHED', 52,
        'from-fuchsia-200 to-pink-300', 45100,
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-176 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-172 days'),
        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-176 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-172 days'));

-- Seed videos point at sample files under the "seed/" prefix in R2 (upload them once; see README).
INSERT INTO video_files (video_id, kind, storage_key, file_name, size_bytes, content_type, status) VALUES
    (1, 'ORIGINAL', 'seed/sample-a.mp4', 'morning-city.mp4',   869093, 'video/mp4', 'AVAILABLE'),
    (2, 'ORIGINAL', 'seed/sample-b.mp4', 'three-recipes.mp4',  911484, 'video/mp4', 'AVAILABLE'),
    (3, 'ORIGINAL', 'seed/sample-c.mp4', 'weekend-reset.mp4',  927769, 'video/mp4', 'AVAILABLE'),
    (5, 'ORIGINAL', 'seed/sample-a.mp4', 'five-min-pasta.mp4', 869093, 'video/mp4', 'AVAILABLE'),
    (6, 'ORIGINAL', 'seed/sample-b.mp4', 'pour-over.mp4',      911484, 'video/mp4', 'AVAILABLE'),
    (7, 'ORIGINAL', 'seed/sample-c.mp4', 'desk-stretch.mp4',   927769, 'video/mp4', 'AVAILABLE'),
    (8, 'ORIGINAL', 'seed/sample-a.mp4', 'tokyo-60.mp4',       869093, 'video/mp4', 'AVAILABLE'),
    (9, 'ORIGINAL', 'seed/sample-b.mp4', 'mobility-flow.mp4',  911484, 'video/mp4', 'AVAILABLE');

INSERT INTO review_logs (video_id, action, actor_id, created_at) VALUES
    (1, 'SUBMITTED', 2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 hours')),
    (6, 'SUBMITTED', 3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 hours')),
    (7, 'SUBMITTED', 4, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')),
    (2, 'SUBMITTED', 2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 days')),
    (2, 'APPROVED',  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (3, 'APPROVED',  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-6 days')),
    (5, 'APPROVED',  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-28 days')),
    (8, 'APPROVED',  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-39 days')),
    (9, 'APPROVED',  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-44 days')),
    (10, 'APPROVED', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-171 days')),
    (11, 'APPROVED', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-179 days')),
    (12, 'APPROVED', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-173 days'));

INSERT INTO video_publications (id, video_id, platform_id, url, published_by, published_at) VALUES
    (1, 3, 1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',                    1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days')),
    (2, 3, 2, 'https://www.tiktok.com/@alexrivers/video/7300000000000000001',   1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days')),
    (3, 5, 2, 'https://www.tiktok.com/@alexrivers/video/7300000000000000002',   1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-27 days')),
    (4, 5, 3, 'https://www.instagram.com/reel/C0FivePasta/',                    1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-27 days')),
    (5, 8, 1, 'https://www.youtube.com/watch?v=9bZkp7q19f0',                    1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-38 days')),
    (6, 8, 3, 'https://www.instagram.com/reel/C0Tokyo60/',                      1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-38 days')),
    (7, 9, 1, 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',                    1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-43 days')),
    (8, 10, 1, 'https://www.youtube.com/watch?v=hT_nvWreIhg',                   1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-170 days')),
    (9, 10, 2, 'https://www.tiktok.com/@mayachen/video/7300000000000000003',    1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-170 days')),
    (10, 11, 1, 'https://www.youtube.com/watch?v=RgKAFK5djSk',                  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-178 days')),
    (11, 11, 3, 'https://www.instagram.com/reel/C0Posture45/',                  1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-178 days')),
    (12, 12, 2, 'https://www.tiktok.com/@alexrivers/video/7300000000000000004', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-172 days'));

INSERT INTO payouts (id, creator_id, amount_cents, status, external_ref, remarks, created_at, paid_at) VALUES
    (1, 1, 77400, 'PAID', 'BANK-TRX-100201', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (2, 2, 283800, 'PAID', 'BANK-TRX-100202', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (3, 3, 154800, 'PAID', 'BANK-TRX-100203', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (4, 1, 91800, 'PAID', 'BANK-TRX-100204', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (5, 2, 336600, 'PAID', 'BANK-TRX-100205', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (6, 3, 183600, 'PAID', 'BANK-TRX-100206', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (7, 1, 84600, 'PAID', 'BANK-TRX-100207', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (8, 2, 310200, 'PAID', 'BANK-TRX-100208', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (9, 3, 169200, 'PAID', 'BANK-TRX-100209', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 1, 118800, 'PAID', 'BANK-TRX-100210', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 2, 435600, 'PAID', 'BANK-TRX-100211', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (12, 3, 237600, 'PAID', 'BANK-TRX-100212', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (13, 1, 199140, 'PAID', 'BANK-TRX-100213', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (14, 2, 457380, 'PAID', 'BANK-TRX-100214', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (15, 3, 249480, 'PAID', 'BANK-TRX-100215', 'Monthly payout', min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+2 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+4 days'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')));

INSERT INTO revenue_entries (video_id, platform_id, period_month, gross_cents, split_pct, creator_share_cents, payout_id, created_by, created_at) VALUES
    (10, 1, strftime('%Y-%m', 'now', 'start of month', '-5 month'), 258000, 60, 154800, 2, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 2, strftime('%Y-%m', 'now', 'start of month', '-5 month'), 215000, 60, 129000, 2, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 1, strftime('%Y-%m', 'now', 'start of month', '-5 month'), 172000, 60, 103200, 3, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 3, strftime('%Y-%m', 'now', 'start of month', '-5 month'), 86000, 60, 51600, 3, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (12, 2, strftime('%Y-%m', 'now', 'start of month', '-5 month'), 129000, 60, 77400, 1, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-4 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 1, strftime('%Y-%m', 'now', 'start of month', '-4 month'), 306000, 60, 183600, 5, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 2, strftime('%Y-%m', 'now', 'start of month', '-4 month'), 255000, 60, 153000, 5, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 1, strftime('%Y-%m', 'now', 'start of month', '-4 month'), 204000, 60, 122400, 6, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 3, strftime('%Y-%m', 'now', 'start of month', '-4 month'), 102000, 60, 61200, 6, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (12, 2, strftime('%Y-%m', 'now', 'start of month', '-4 month'), 153000, 60, 91800, 4, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-3 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 1, strftime('%Y-%m', 'now', 'start of month', '-3 month'), 282000, 60, 169200, 8, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 2, strftime('%Y-%m', 'now', 'start of month', '-3 month'), 235000, 60, 141000, 8, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 1, strftime('%Y-%m', 'now', 'start of month', '-3 month'), 188000, 60, 112800, 9, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 3, strftime('%Y-%m', 'now', 'start of month', '-3 month'), 94000, 60, 56400, 9, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (12, 2, strftime('%Y-%m', 'now', 'start of month', '-3 month'), 141000, 60, 84600, 7, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-2 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 1, strftime('%Y-%m', 'now', 'start of month', '-2 month'), 396000, 60, 237600, 11, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 2, strftime('%Y-%m', 'now', 'start of month', '-2 month'), 330000, 60, 198000, 11, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 1, strftime('%Y-%m', 'now', 'start of month', '-2 month'), 264000, 60, 158400, 12, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 3, strftime('%Y-%m', 'now', 'start of month', '-2 month'), 132000, 60, 79200, 12, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (12, 2, strftime('%Y-%m', 'now', 'start of month', '-2 month'), 198000, 60, 118800, 10, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-1 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (3, 1, strftime('%Y-%m', 'now', 'start of month', '-1 month'), 124000, 60, 74400, 13, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 1, strftime('%Y-%m', 'now', 'start of month', '-1 month'), 415800, 60, 249480, 14, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (10, 2, strftime('%Y-%m', 'now', 'start of month', '-1 month'), 346500, 60, 207900, 14, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 1, strftime('%Y-%m', 'now', 'start of month', '-1 month'), 277200, 60, 166320, 15, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (11, 3, strftime('%Y-%m', 'now', 'start of month', '-1 month'), 138600, 60, 83160, 15, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (12, 2, strftime('%Y-%m', 'now', 'start of month', '-1 month'), 207900, 60, 124740, 13, 1, min(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'start of month', '-0 month', '+1 day'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))),
    (3, 2, strftime('%Y-%m', 'now'), 47500, 60, 28500, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (5, 2, strftime('%Y-%m', 'now'), 86000, 60, 51600, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (8, 1, strftime('%Y-%m', 'now'), 211000, 60, 126600, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (8, 3, strftime('%Y-%m', 'now'), 39000, 60, 23400, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (9, 1, strftime('%Y-%m', 'now'), 52000, 60, 31200, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (10, 1, strftime('%Y-%m', 'now'), 397400, 60, 238440, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (10, 2, strftime('%Y-%m', 'now'), 331100, 60, 198660, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (11, 1, strftime('%Y-%m', 'now'), 264900, 60, 158940, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (11, 3, strftime('%Y-%m', 'now'), 132400, 60, 79440, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    (12, 2, strftime('%Y-%m', 'now'), 198700, 60, 119220, NULL, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days'));

INSERT INTO audit_logs (entity, entity_id, title, action, detail, actor_id, created_at) VALUES
    ('VIDEO', 'V-2406', 'Weekend reset routine', 'Published', 'Published to YouTube, TikTok', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days')),
    ('VIDEO', 'V-2407', '3 recipes in 30 seconds', 'Approved', 'Approved by Morgan Hale', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 days')),
    ('VIDEO', 'V-2398', 'The perfect pour-over', 'In Review', 'Submitted by Maya Chen', 3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-3 hours')),
    ('VIDEO', 'V-2408', 'A morning in the city', 'In Review', 'Submitted by Alex Rivers', 2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-2 hours'));
