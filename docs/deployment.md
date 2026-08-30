# Deployment

## Local development

```powershell
pip install -e ..\Flaxon-Backend-Framework-main[standard,security]
pip install -r requirements.txt
$env:FLAXON_ADMIN_PASSWORD = "use-a-strong-local-password"
flaxon run app:app --reload --port 8000
```

## Vercel and Neon

The Vercel entrypoint is `app.py`. Configure these Vercel environment
variables:

```env
FLAXON_ENV=production
FLAXON_SECRET_KEY=long-random-secret
FLAXON_ADMIN_USERNAME=aldane
FLAXON_ADMIN_PASSWORD=strong-secret
FLAXON_ADMIN_EMAIL=aldane@example.com
SITE_URL=https://flaxonlabs.dev
DATABASE_URL=postgresql://...neon.tech/...?...sslmode=require
REDIS_URL=rediss://:password@your-redis-provider.example/0
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
BLOB_PUBLIC_URL=https://...public.blob.vercel-storage.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM=Flaxon Labs <no-reply@example.com>
SMTP_TLS=true
```

Neon stores Admin and CMS namespaces. When `REDIS_URL` is set, Admin uses
Redis-backed sessions with an eight-hour idle timeout and CMS uses Redis for
distributed coordination. Without it, local sessions and coordination are
process-local and are not suitable for multiple workers. Redis connections
use RESP2 and a bounded pool by default.

Vercel Blob stores media objects while
the Admin metadata remains in the database. Do not commit credentials or local
`var/` and `uploads/` data.

When SMTP settings are present, Admin password-reset and email-verification
requests send one-time links through the configured provider. Without SMTP,
the flows remain available for development but no delivery occurs.

Deploy with the repository connected to Vercel. The health endpoint is
`/api/health`; it checks the database and returns HTTP `503` when that
dependency is unavailable. Its `checks` object reports Blob, Redis, and
GitHub configuration. The authenticated operational check is
`/admin/labs/health`.

Vercel serverless execution is suitable for the website's HTTP pages and APIs.
Long-running workers, scheduled publishing, and WebSocket workloads should be
run through an external worker or managed service rather than assumed to stay
alive inside a serverless invocation.
