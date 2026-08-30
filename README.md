# Flaxon Labs Website

The public Flaxon Labs organization website is built with Flaxon, Jinax, the
Flaxon Admin, and the Flaxon CMS. Aldane Hutchinson is the Head of Flaxon Labs.

## Run locally

From the website directory, install the local framework in editable mode:

```powershell
pip install -e ..\Flaxon-Backend-Framework-main[standard,security]
pip install -r requirements.txt
flaxon run app:app --reload --port 8000
```

Open `http://127.0.0.1:8000`. The Admin is at `/admin/login` and the CMS is at
`/admin/cms/`. Set `FLAXON_ADMIN_PASSWORD` before using the local account.

## Production

Set `DATABASE_URL` to the Neon pooled PostgreSQL connection string. Set
`BLOB_READ_WRITE_TOKEN` and `BLOB_PUBLIC_URL` for Vercel Blob media. Never
commit `.env` or credentials. Run `flaxon migrate --database "$env:DATABASE_URL"
--migrations-dir migrations` against the generated migrations before the first
production deployment.

See [`docs/production.md`](docs/production.md) for the complete production
configuration and operations runbook.
