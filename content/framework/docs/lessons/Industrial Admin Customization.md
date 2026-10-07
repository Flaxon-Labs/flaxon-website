# Industrial Admin Customization

This lesson shows how to turn Flaxon's Admin into an operations console for a
real business application. The examples use a flower shop, but the same
patterns apply to inventory, healthcare, education, logistics, SaaS, and
internal enterprise tools.

The Admin is a management surface, not your domain model. Keep business rules
in services and repositories, then let Admin call those same services. This
prevents an Admin action from accidentally behaving differently from an API,
worker, or scheduled job.

## 1. Recommended project structure

```text
flower-shop/
|-- app.py
|-- pyproject.toml
|-- .env.example
|-- migrations/
|-- src/flower_shop/
|   |-- models.py
|   |-- repositories.py
|   |-- services.py
|   |-- admin.py
|   |-- admin_routes.py
|   |-- templates/admin/
|   `-- static/admin/
`-- tests/
    |-- test_admin_permissions.py
    `-- test_admin_workflows.py
```

Use the same service layer from Admin and public endpoints:

```python
# src/flower_shop/services.py
class FlowerService:
    def __init__(self, repository):
        self.repository = repository

    async def archive(self, flower_id: str):
        flower = await self.repository.get(flower_id)
        if flower is None:
            return None
        return await self.repository.update(flower_id, {"status": "archived"})
```

## 2. Bootstrap a persistent Admin

```python
# app.py
import os

from flaxon import Flaxon
from flaxon.admin import AdminConfig, AdminDashboard
from flaxon.admin.cms import CMS

app = Flaxon("flower-shop", debug=False)

# Attach your initialized DatabaseManager or adapter before this block.
database = app.database

admin = AdminDashboard(
    app,
    url_prefix="/admin",
    config=AdminConfig(
        site_title="Petal and Stem Admin",
        site_header="Petal and Stem Operations",
        index_title="Flower shop operations",
        timezone="UTC",
    ),
    database=database,
    redis_url=os.environ.get("REDIS_URL"),
    redis_protocol=2,
    redis_max_connections=100,
    session_idle_timeout=1800,
    max_upload_size=10 * 1024 * 1024,
    allowed_upload_types={
        "image/jpeg", "image/png", "image/webp", "application/pdf",
    },
)

cms = CMS(
    app,
    url_prefix="/admin/cms",
    title="Petal and Stem Content",
    auth=admin.auth,
    database=database,
    redis_url=os.environ.get("REDIS_URL"),
)
```

Use a database-backed Admin store or Redis session backend in production. The
default in-memory session behavior is for development and does not coordinate
multiple workers.

## 3. Register a model with real CRUD hooks

```python
from flaxon.admin import admin_model


@admin_model(
    list_display=["name", "sku", "price", "stock", "status"],
    list_filter=["status"],
    search_fields=["name", "sku"],
    fields=["name", "sku", "price", "stock", "status"],
)
class Flower:
    repository = None

    @classmethod
    async def get_instances(cls):
        return await cls.repository.list()

    @classmethod
    async def get_instance(cls, object_id):
        return await cls.repository.get(object_id)

    @classmethod
    async def create_instance(cls, data):
        return await cls.repository.create(data)

    @classmethod
    async def update_instance(cls, object_id, data):
        return await cls.repository.update(object_id, data)

    @classmethod
    async def delete_instance(cls, object_id):
        return await cls.repository.delete(object_id)


admin.register(Flower)
```

For production, validate prices, stock, SKU uniqueness, and state transitions
in the repository or service layer. Admin field configuration controls the
management UI; it is not a substitute for server-side validation.

## 4. Protect custom Admin pages

Custom pages should authenticate and authorize at the route boundary. Do not
rely on a hidden navigation item as security.

```python
# src/flower_shop/admin_routes.py
from flaxon.http import JSONResponse


def register_admin_routes(app, admin, flower_service):
    async def inventory(request):
        user = await admin._require_user(request, "admin:read")
        flowers = await flower_service.repository.list()
        return await request.render(
            "admin/inventory.html",
            {"user": user, "flowers": flowers, "dashboard": admin},
        )

    async def archive(request, flower_id: str):
        await admin._require_user(request, "flower:update")
        form = await request.form()
        data = form.to_dict() if hasattr(form, "to_dict") else dict(form)
        admin.validate_csrf(data)
        result = await flower_service.archive(flower_id)
        if result is None:
            return JSONResponse({"error": "Flower not found"}, status_code=404)
        return JSONResponse({"ok": True, "flower": result})

    app.router.route("/admin/inventory", methods={"GET"}, name="inventory")(inventory)
    app.router.route(
        "/admin/flowers/<flower_id>/archive",
        methods={"POST"},
        name="archive_flower",
    )(archive)
```

Every browser mutation must include the CSRF token. A custom SPA must send the
same token in the <code>X-CSRF-Token</code> header and handle `401`, `403`, and
`422` responses explicitly.

## 5. Add a custom Admin template

Create `templates/admin/inventory.html`:

```html
{% extends "admin/base.html" %}
{% block content %}
<section class="admin-page">
  <header class="admin-page-header">
    <div>
      <p class="eyebrow">Operations</p>
      <h1>Inventory</h1>
    </div>
  </header>
  <table>
    <thead><tr><th>Name</th><th>SKU</th><th>Stock</th><th>Status</th></tr></thead>
    <tbody>
    {% for flower in flowers %}
      <tr>
        <td>{{ flower.name }}</td>
        <td>{{ flower.sku }}</td>
        <td>{{ flower.stock }}</td>
        <td>{{ flower.status }}</td>
      </tr>
    {% else %}
      <tr><td colspan="4">No inventory records found.</td></tr>
    {% endfor %}
    </tbody>
  </table>
</section>
{% endblock %}
```

Keep custom templates compatible with the Admin base template and use Jinax
autoescaping for user-controlled values. Add custom CSS below your app's
Admin static directory rather than modifying framework package files.

## 6. Add a controlled workflow action

A publish, archive, refund, or approve action should call a service, record an
activity event, and be idempotent. Bulk actions must enforce the specific model
permission, such as `flower:update`, not only a broad write permission.

```python
async def archive_flowers(ids, service, actor):
    updated = []
    for object_id in ids:
        flower = await service.archive(object_id)
        if flower is not None:
            updated.append(flower["id"])
    return {"updated": updated, "actor": actor["username"]}
```

For high-value operations, require a confirmation screen, write an audit
event with actor and request metadata, and run the service inside one database
transaction where the adapter supports it.

## 7. Configure users and roles

Use least privilege. A typical shop setup has:

```text
administrator: admin:superuser
manager: admin:read, admin:write, flower:read, flower:create, flower:update
editor: admin:read, flower:read
warehouse: admin:read, flower:read, flower:update
```

Keep system roles protected and do not grant `admin:superuser` to ordinary
staff. Test both the API response and the rendered UI for each role. The UI
can hide unavailable actions, but the route must still reject them.

## 8. Add CMS content and media

Use CMS for editorial records such as landing pages, campaigns, blog posts,
and announcements. Use Admin models for operational records such as orders,
inventory, and staff.

```python
from flaxon.admin.cms import CMSField, ContentType

cms.register(ContentType(
    "campaign",
    label="Campaign",
    label_plural="Campaigns",
    fields=[
        CMSField("title", required=True),
        CMSField("body", type="richtext"),
        CMSField("status", type="select", choices=["draft", "review", "published"]),
        CMSField("publish_at", type="datetime"),
    ],
    list_display=["title", "status", "updated_at"],
    list_filter=["status"],
    search_fields=["title", "body"],
))
```

Configure allowed MIME types, upload size limits, a scanner, object storage,
and a durable worker for thumbnail processing. Do not make a public media URL
private merely by hiding it in the UI; use signed URLs for private assets.

## 9. Persistence, migrations, and deployment

Generate and apply Admin migrations before starting web processes:

```python
from flaxon.admin import write_admin_migration

write_admin_migration("migrations")
```

```powershell
flaxon migrate --database $env:DATABASE_URL --migrations-dir migrations
flaxon run app:app --host 0.0.0.0 --port 8000
```

Production configuration should include a strong `FLAXON_SECRET_KEY`, a
database URL, Redis for shared sessions and locks, external mail delivery,
object storage, and a worker process for scheduled or durable jobs. Keep
`debug=False`, put the application behind HTTPS, and configure backups,
monitoring, log retention, and alerting outside the Admin UI.

## 10. Test the Admin as a user would

```python
import pytest
from flaxon.testing import AsyncTestClient


@pytest.mark.asyncio
async def test_editor_cannot_archive(app):
    async with AsyncTestClient(app) as client:
        login = await client.post(
            "/admin/login",
            data={"username": "editor", "password": "test-password"},
        )
        assert login.status_code in {200, 302}
        response = await client.post("/admin/flowers/1/archive", data={})
        assert response.status_code == 403
```

Also test login throttling, CSRF failures, expired sessions, inactive users,
role boundaries, duplicate submissions, concurrent edits, upload rejection,
database rollback, and worker restart behavior. Browser tests should cover the
actual responsive navigation and every important create/edit/delete workflow.

## Production checklist

- Use persistent Admin storage and migrations.
- Configure Redis for multi-worker sessions, limits, locks, and events.
- Enforce model-action permissions in every custom route and action.
- Include CSRF tokens in all browser mutations.
- Keep business rules in services and wrap related writes in transactions.
- Enable password policy, MFA, reset mail, and account-specific rate limits.
- Validate media type and size, scan uploads, strip unsafe metadata, and use signed URLs.
- Run thumbnails and scheduled publishing through durable workers.
- Record audit events with actor, IP, user agent, retention, and integrity checks.
- Add tests for allowed and denied workflows, not only successful pages.
