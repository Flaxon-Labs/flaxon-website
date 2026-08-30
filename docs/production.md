# Production Runbook

## Configuration

Use the editable Flaxon checkout during development and configure secrets only
through the deployment environment. Production startup rejects the development
secret and default Admin password.

```env
FLAXON_ENV=production
FLAXON_SECRET_KEY=<random value at least 32 characters>
FLAXON_ADMIN_USERNAME=aldane
FLAXON_ADMIN_PASSWORD=<strong password>
FLAXON_ADMIN_EMAIL=admin@example.com
SITE_URL=https://flaxonlabs.dev
DATABASE_URL=postgresql://...neon.tech/...?...sslmode=require
REDIS_URL=rediss://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
BLOB_PUBLIC_URL=https://...public.blob.vercel-storage.com
GITHUB_ORG=Flaxon-Labs
GITHUB_TOKEN=github_pat_...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM=Flaxon Labs <no-reply@example.com>
SMTP_TLS=true
```

Production startup requires Neon (or another PostgreSQL-compatible database),
Redis, Vercel Blob, and SMTP. Neon is the durable Admin, CMS, and website
database. Redis enables shared Admin sessions, distributed rate limits, and CMS
publishing coordination. Blob stores media objects; Admin media metadata
remains in the database. SMTP enables password-reset and email-verification
delivery. This prevents a deployment from silently running with process-local
fallbacks.

When `DATABASE_URL` is set, the website also initializes Flaxon's
`PostgreSQLAdminStore` for Admin jobs, audit entries, notification preferences,
WebAuthn state, and resumable-upload sessions. `psycopg[binary]` is included in
the website dependencies. Redis remains required for shared sessions, request
rate limits, and cross-worker coordination.

## First deployment

```powershell
pip install "flaxon[standard,security]==0.2.4"
pip install -r requirements.txt
flaxon migrate --database "$env:DATABASE_URL" --migrations-dir migrations
python scripts/seed.py
flaxon run app:app --host 0.0.0.0 --port 8000
```

The Vercel entrypoint is `app.py`; configure the same environment variables in
the Vercel project. Long-running workers and scheduled jobs should run on an
external worker platform, not inside a serverless request.

## Operations

Use `/admin/login` for Admin and `/admin/cms/` for CMS. Custom organization
operations are under `/admin/labs/`. Public health is `/api/health` and returns
`503` when the database check fails. The Admin health page requires an
authenticated `admin:read` session.

Run the automated checks against a running local server:

```powershell
python -m pytest --no-cov -q
python scripts/browser_smoke.py
```

The browser check covers public navigation, forms, Admin authentication,
settings persistence, custom Admin pages, CMS create/edit, mobile layout, 404
handling, and static assets.
