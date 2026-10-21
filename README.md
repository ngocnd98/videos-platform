# PulseMedia Hub — demo

Demo of the main flow from `prototype-v104.html`:
creator upload → admin review → manual publishing → revenue & payout.

| Part | Stack |
|---|---|
| `frontend/` | Vite, React, TypeScript, Tailwind 3, TanStack Query, react-router |
| `backend/` | Java 21, Spring Boot 3.5, Spring JDBC, SQLite, Flyway, JWT |
| Storage | Cloudflare R2 (S3 API, presigned multipart upload) |
| Deploy | Render free web service, single Docker image |

> The SQLite database is **ephemeral by design**: it is recreated from `V2__seed.sql` on every start.
> On Render free the service sleeps after ~15 min idle and comes back with fresh seed data.

## Demo script

1. **Creator** (header switch → Creator): Upload videos → pick an MP4, fill the form, *Upload & submit*.
   Try *Simulate connection loss*, reload the page, pick the same file and *Retry from X%*.
2. **Admin**: Content review → *Preview* (plays from R2) → *Approve*, or *Reject* with a reason.
   *Audit log* shows every decision.
3. Publishing → *Ready to publish* → *Download original* → *Record publishing* with YouTube/TikTok/Instagram
   links (checked as you type). *Export* gives a CSV.
4. Revenue → *Manual entry* or *CSV import* (sample file in the dialog); edit gross inline to see the
   60/40 split recalculate. *Unpaid balances* → *Mark as paid* with the bank reference.
5. **Creator**: Dashboard shows the new pending payout / total earned; *Payout statement* prints a monthly statement.

Not built in this demo: Analytics, My profile and Staff & roles pages (placeholders), staff-role permissions,
resubmitting a rejected video from the UI, email notifications.

## Run locally

Requires JDK 21, Maven and Node 22.

```bash
# 1. Backend on :8080 (R2 vars are optional until the upload step)
cd backend
set -a; source ../.env; set +a      # optional
mvn spring-boot:run

# 2. Frontend on :5173, proxies /api to :8080
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Use the **Admin / Creator** switch in the header; it signs in as the seeded accounts:

| Account | Role |
|---|---|
| `admin@pulsemedia.demo` | Admin (Superadmin) |
| `alex@pulsemedia.demo` | Creator (Alex Rivers) |
| `maya@pulsemedia.demo`, `jordan@pulsemedia.demo` | Creators |

Password for all: `demo1234`. Delete `backend/data/app.db` to reset local data.

Run backend tests: `cd backend && mvn test`.

## Docker

```bash
docker build -t pulsemedia-hub .
docker run --rm -p 8080:8080 --env-file .env pulsemedia-hub
```

## Deploy to Render

1. Push this repo to GitHub/GitLab.
2. Render dashboard → **New → Blueprint** → pick the repo. `render.yaml` creates the `pulsemedia-hub` web service (free, Singapore).
3. Fill in `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` when prompted. `JWT_SECRET` is generated.
4. Health check: `https://<service>.onrender.com/api/health`.

## Cloudflare R2 setup

Already applied to bucket `video-platform-demo`. To redo it (needs an admin R2 token), with `.env` loaded:

```bash
set -a; source .env; set +a
python3 scripts/r2/r2admin.py PUT cors scripts/r2/cors.xml            # browser uploads
python3 scripts/r2/r2admin.py PUT lifecycle scripts/r2/lifecycle.xml  # cleanup rules
python3 scripts/r2/r2admin.py GET cors                                # check
python3 scripts/r2/r2put.py seed/sample-a.mp4 ./sample-a.mp4 video/mp4  # seed videos (a, b, c)
```

- **CORS** (`scripts/r2/cors.xml`) allows GET/PUT/HEAD from `localhost:5173`, `localhost:8080` and
  `https://pulsemedia-hub.onrender.com`, and exposes `ETag` (the browser needs each part's ETag to
  complete a multipart upload). **If Render gives the service a different URL, add it there and re-apply.**
- **Lifecycle** (`scripts/r2/lifecycle.xml`): objects under `demo/` expire after 7 days (uploads from
  earlier boots whose DB rows are gone); incomplete multipart uploads are aborted after 1 day.
- **Seed videos**: `seed/sample-a.mp4`, `seed/sample-b.mp4`, `seed/sample-c.mp4`, used by the seeded
  videos for preview/download. `seed/` is not covered by the expiry rule.

## Upload flow

1. `POST /api/creator/videos` creates a DRAFT with the form metadata.
2. `POST …/{code}/upload` starts an R2 multipart upload (10 MiB parts) → `uploadId`, `partCount`.
3. `POST …/{code}/upload/parts` returns presigned PUT URLs; the browser uploads 3 parts in parallel
   straight to R2 (`frontend/src/upload/multipartUpload.ts`).
4. Resume: `GET …/{code}/upload` lists the parts R2 already holds, and only the rest are sent.
   The browser keeps a checkpoint in localStorage so "Retry from X%" survives a reload.
   `410 Gone` means the session is gone (e.g. the server restarted) and the page starts over.
5. `POST …/{code}/upload/complete` → R2 assembles the file; the server checks its size with `HEAD`.
6. Optional thumbnail (a frame captured in the browser) → `POST …/{code}/thumbnail`.
7. `POST …/{code}/submit` → `IN_REVIEW`, visible in the admin review queue.

## Layout

```
backend/src/main/java/com/pulsemedia/hub/
  auth/       login, /me
  security/   JWT filter, role rules (/api/admin/** = ADMIN, /api/creator/** = CREATOR)
  storage/    ObjectStorage interface, R2 implementation, object key layout
  video/      creator videos: drafts, multipart upload, submit
  review/     moderation queue, approve/reject, audit log
  publishing/ download original, record platform links, CSV export
  revenue/    revenue entries, CSV import, payouts, statements
  dashboard/  admin and creator dashboard queries
  config/     app properties, SPA fallback
  common/     errors, health
backend/src/main/resources/db/migration/  V1 schema, V2 seed
frontend/src/
  api/ auth/ layout/ ui/ pages/
```
