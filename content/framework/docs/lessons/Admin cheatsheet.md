# Admin and CMS Cheat Sheet

Current quick reference for Flaxon's model admin and CMS. For full
production guidance, see [Admin and CMS Production Guide](../guides/admin-cms.md).

## Mount Both Panels

```python
from flaxon import Flaxon
from flaxon.admin import AdminConfig, AdminDashboard
from flaxon.admin.cms import CMS

app = Flaxon("backoffice", debug=True)
admin = AdminDashboard(
    app,
    config=AdminConfig(site_title="Acme Backoffice", timezone="UTC"),
    url_prefix="/admin",
    storage_path="var/admin.sqlite3",
    users=[{"username": "admin", "password": "change-me"}],
)
cms = CMS(app, url_prefix="/admin/cms", title="Acme Content", auth=admin.auth)
```

Run locally:

```bash
flaxon run app:app --reload
```

Open `/admin/login`, `/admin/`, and `/admin/cms/`. Use `database=` instead of
`storage_path` when the project owns the database connection.

## Persist and Migrate

```python
from flaxon.admin import write_admin_migration
write_admin_migration("migrations")
```

```bash
flaxon migrate --database sqlite://./app.db --migrations-dir migrations
```

Never use default in-memory state for production or multiple workers. Use a
shared database or durable `storage_path`; use Redis for shared session/event
broadcasting when configured in the application.

## Register a Model

```python
from flaxon.admin import admin_model

@admin_model(
    list_display=["id", "name", "price"],
    list_filter=["active"],
    search_fields=["name", "sku"],
    fields=["name", "sku", "price", "active"],
    readonly_fields=["created_at"],
)
class Product:
    @classmethod
    async def get_instances(cls): ...
    @classmethod
    async def get_instance(cls, id): ...
    @classmethod
    async def create_instance(cls, data): ...
    @classmethod
    async def update_instance(cls, id, data): ...
    @classmethod
    async def delete_instance(cls, id): ...
```

The five CRUD hooks may be sync or async. Register on a dashboard instead when
you need an explicit registry:

```python
admin.register(Product, list_display=["name"], search_fields=["name"])
```

## Model URLs and Controls

```text
/admin/                         dashboard
/admin/<model>                  list, search, filters, sorting, pagination
/admin/<model>/add              create form
/admin/<model>/<id>              detail
/admin/<model>/<id>/edit        update form
/admin/<model>/<id>/delete      delete confirmation
/admin/<model>/<id>/history     audit history
/admin/<model>/actions/<name>   bulk action
/admin/search?q=...             global model search
```

The dashboard also provides `/users`, `/roles`, `/media`, `/settings`,
`/activity`, `/activity/export`, `/notifications`, and `/operations`.

## Custom Bulk Actions

Actions receive selected record IDs. Attach them to the registered model:

```python
async def archive(ids):
    for record_id in ids:
        await Product.update_instance(record_id, {"active": False})

admin.registry.get("product").add_action("archive", archive)
```

The list UI submits selected IDs to the action route. Keep authorization and
business validation in the service called by the action.

## Permissions

Built-in permissions include `admin:read`, `admin:write`, `admin:users`,
`admin:media`, `admin:settings`, and `admin:superuser`. Model permissions use
`<model>:create`, `<model>:read`, `<model>:update`, and `<model>:delete`.

```python
admin.roles["publisher"] = [
    "admin:read", "admin:write", "post:read", "post:update",
]
admin.auth.role_permissions = admin.roles
```

Do not give editors `admin:superuser`. The role editor and user editor expose
the same changes through the UI.

## CMS Schema

```python
from flaxon.admin.cms import CMSField, ContentType

cms.register(ContentType(
    name="post",
    fields=[
        CMSField("title", required=True),
        CMSField("body", type="richtext"),
        CMSField("hero", type="image"),
        CMSField("published_on", type="datetime"),
        CMSField("related", type="relationship"),
        CMSField("blocks", type="repeater"),
        CMSField("seo", type="json"),
    ],
    list_display=["title", "status", "updated_at"],
    list_filter=["status"],
    search_fields=["title", "body"],
    statuses=["draft", "review", "approved", "scheduled", "published", "archived"],
))
```

Field types: `text`, `textarea`, `richtext`, `boolean`, `number`, `date`,
`datetime`, `email`, `url`, `select`, `json`, `repeater`, `relationship`,
`file`, and `image`.

The SPA supports autosave, unsaved-change warnings, media workflows, revision
restore, scheduling fields, bulk publish/unpublish, taxonomy, comments, menus,
and CSV/JSON import/export. Revision comparison data, menu hierarchy data, and
media metadata are available through APIs; visual diffing, nested drag-and-drop
editing, thumbnails, editorial calendars, and a full notification inbox are not
provided as complete built-in workflows.

## CMS API Shortcuts

```text
GET    /admin/cms/api/config
GET    /admin/cms/api/stats
GET    /admin/cms/api/post/items?q=hello&filter_status=draft&page=1
POST   /admin/cms/api/post/items
PUT    /admin/cms/api/post/items/<id>
DELETE /admin/cms/api/post/items/<id>
GET    /admin/cms/api/post/items/<id>/history
POST   /admin/cms/api/post/items/<id>/restore/<revision>
POST   /admin/cms/api/post/actions/publish
GET    /admin/cms/api/export/post?format=csv
POST   /admin/cms/api/import/post
GET/POST /admin/cms/api/taxonomies
GET/POST /admin/cms/api/comments
GET/PUT /admin/cms/api/menus/main
```

Every mutation requires an authenticated session and the `X-CSRF-Token`
header. Custom clients must send cookies with `credentials: "same-origin"`.

## Hooks and Widgets

```python
def validate_post(record):
    if not record.get("title", "").strip():
        raise ValueError("Title is required")
    return record

cms.add_hook("before_create", validate_post)
admin.register_widget(lambda: {"title": "Queue", "value": "ready"})
```

Available CMS lifecycle hooks include `before_create`, `after_create`,
`before_update`, `after_update`, `before_delete`, `after_delete`, and restore
hooks. Use a custom `AuthenticationBackend`, `template_dir`, or `template_path`
when integrating with an existing application shell.

## Security Rules

- Keep CSRF enabled on all browser forms and SPA writes.
- Use HTTPS, strong secrets, login throttling, and MFA in production.
- Configure password reset and optional email verification senders.
- Restrict upload MIME types and maximum size; use durable object storage.
- Keep rich-text sanitization enabled with the smallest required allowlist.
- Treat imported CSV/JSON and public comments as untrusted input.
- Use shared sessions and Redis events for multiple workers.

## Test the Workflow

Test login, permissions, create/edit/delete, revision restore, media upload,
moderation, scheduled publishing, import/export, and menu persistence through
both API tests and browser automation. The complete runnable example is
`docs/examples/cms/full_admin_cms/app.py`.
# Admin Production Hardening Cheatsheet

## Shared deployment

```python
from flaxon.admin import AdminDashboard

admin = AdminDashboard(
    app,
    storage_path="var/admin.sqlite3",
    redis_url="redis://127.0.0.1:6379/0",
    redis_protocol=2,
    redis_max_connections=100,
    session_idle_timeout=1800,
)
```

Use the same Redis URL and persistent database for every worker. Never use the
default in-memory session backend in production.

## Durable jobs

```python
from flaxon.admin import DurableJobStore, DurableJobWorker

jobs = DurableJobStore(admin.store)
worker = DurableJobWorker(jobs)
worker.register("reports.generate", generate_report)
jobs.enqueue("reports.generate", {"id": "42"}, max_attempts=5)
await worker.run_once()
```

## Resumable upload protocol

```text
POST  /admin/media/resumable
PATCH /admin/media/resumable/{upload_id}       Upload-Offset: 0
POST  /admin/media/resumable/{upload_id}/complete
```

Send `filename`, `total_size`, and optional `sha256` when creating the
session. Send raw bytes for each chunk and include `X-CSRF-Token`.

## Audit and notifications

```python
from flaxon.admin import ImmutableAuditLog, NotificationService

audit = ImmutableAuditLog(admin.store)
assert audit.verify()
audit.prune(before_timestamp)

notifications = NotificationService(admin.store)
notifications.set_preferences("editor", {"email": True, "webhook": False})
notifications.publish("editor", "email", {"subject": "Review needed"}, send_email)
```

Verify audit integrity after restore operations and retain the database using
your organization’s retention policy.

## WebAuthn

```python
from flaxon.admin import WebAuthnService

admin.webauthn = WebAuthnService(admin.store, provider=my_webauthn_provider)
```

The provider must implement registration and assertion verification using a
maintained WebAuthn library. Do not implement assertion verification in the
browser or trust client-provided credential IDs without provider validation.

## API and UI rules

- Include `_csrf` in browser forms and `X-CSRF-Token` in SPA mutations.
- Enforce `<model>:create`, `<model>:read`, `<model>:update`, and
  `<model>:delete` permissions server-side.
- Run `flaxon migrate` before starting workers and web processes.
