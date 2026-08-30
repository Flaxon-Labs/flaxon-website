# Content Model Contract

Content types are registered in `src/flaxon_labs/cms/setup.py`. Required fields,
field types, choices, list columns, filters, and search fields are declared in
the schema so the CMS SPA and public routes use the same contract.

Public routes only render records whose status is `published`. Posts may use
`scheduled` with `publish_at`; a worker should run the framework scheduler in
production. Rich text is sanitized by the framework allowlist before rendering.

Keep URLs stable by setting an explicit slug where external links depend on it.
Use revisions and restore for editorial recovery, and use the Admin export
routes for backup or migration workflows.
