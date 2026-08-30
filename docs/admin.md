# Admin Operations

Flaxon Labs uses the framework Admin at `/admin/login`. The seeded local account
is controlled by `FLAXON_ADMIN_USERNAME`, `FLAXON_ADMIN_PASSWORD`, and
`FLAXON_ADMIN_EMAIL`; never commit those values.

## Features

The Admin provides authenticated dashboard access, model CRUD, search,
filters, pagination, export/import, users and roles, MFA, password recovery,
email verification, media management, notifications, audit history, system
operations, CSRF protection, rate limiting, and custom organization pages under
`/admin/labs/`.

## Custom Pages

Register organization-specific pages in `src/flaxon_labs/admin/routes.py` and
protect every handler with Admin authorization:

```python
user = await admin._require_user(request, "admin:read")
```

Mutating handlers must validate the submitted CSRF token and use the narrowest
permission available, then persist changes through the configured database.
See [custom Admin pages](custom-admin-pages.md) and the
[production runbook](production.md).

## Production

Use Neon/PostgreSQL for the application database, `PostgreSQLAdminStore` for
auxiliary Admin state, Redis for shared sessions and coordination, Vercel Blob
for media, and SMTP for recovery and verification delivery.
