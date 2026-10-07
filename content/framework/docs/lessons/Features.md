# Flaxon Features

For a complete industrial Admin customization walkthrough, see [Industrial Admin Customization](Industrial%20Admin%20Customization.md).

This page is a runnable feature map. For complete Admin/CMS guidance, see [Admin and CMS](../guides/admin-cms.md), [Admin API](../api/admin-cms.md), and the [Admin cheatsheet](Admin%20cheatsheet.md).

## Application and routing

```python
from flaxon import Flaxon
app = Flaxon("my-api", debug=True)

@app.get("/")
async def home(): return {"message": "Hello"}

@app.get("/users/<int:user_id>")
async def get_user(user_id: int): return {"id": user_id}
```

Use `@app.get`, `post`, `put`, `patch`, `delete`, and `websocket`. Path converters include `int`, `float`, `str`, `uuid`, and `path`. Handlers can receive path values, `request`, WebSocket objects, container dependencies, and `Schema` body parameters. Return a dict/list for JSON, a string for text, or an explicit response class.

## Middleware, validation, sessions, and security

Flaxon includes request IDs, security headers, recovery, CORS, compression, timeouts, trusted hosts, body limits, proxy headers, metrics, rate limiting, and CSRF middleware. Add middleware with `app.add_middleware(...)`; request IDs and security headers are enabled by default.

```python
from flaxon.validation import Schema, fields
from flaxon.security.csrf import CSRFMiddleware

class CreateUser(Schema):
    name = fields.StrField(required=True, min_length=2)
    email = fields.EmailField(required=True)

app.add_middleware(CSRFMiddleware)

@app.post("/users")
async def create_user(data: CreateUser): return data.to_dict()
```

Schema failures return `422` with field errors. Fields include string, integer, float, boolean, email, date/time, decimal, UUID, list, choice, and nested fields. `request.session` is signed-cookie backed by default; use a shared database or Redis store for multi-worker deployments. Security helpers include `PasswordHasher`, `JWT`, `jwt_required`, `role_required`, `permission_required`, `api_key_required`, `APIKeyManager`, `CSRFMiddleware`, and `RateLimitMiddleware`.

## Dependency injection

```python
app.container.register_instance("settings", settings)
app.container.register_factory("EmailService", lambda: EmailService(), singleton=True)
```

Dependencies resolve by registered name and then by type annotation.

## WebSockets, GraphQL, and OpenAPI

WebSockets support accept, room membership, JSON send/receive, iteration, broadcast, and close. `app.enable_graphql(GraphQLSchema(query=query_type))` registers GraphQL and playground routes. `app.enable_openapi(title="My API")` registers `/openapi.json`, `/docs`, and `/redoc`.

## Admin and CMS

```python
from flaxon.admin import AdminConfig, AdminDashboard
from flaxon.admin.cms import CMSConfig
from flaxon.database.adapters.sqlite import SQLiteAdapter

admin = AdminDashboard(
    app,
    config=AdminConfig(site_title="Acme Admin"),
    database=SQLiteAdapter("data/admin.db"),
    cms_config=CMSConfig(enabled=True),
)
admin.register(Product, list_display=["name", "price"], fields=["name", "price"])
```

`app.enable_admin(...)` is the convenience method for the same dashboard. The dashboard provides authentication, CSRF-protected forms, permissions, users and roles, settings, audit history, model CRUD, search/filter/sort/pagination, bulk actions, media, taxonomies, comments, menus, revisions, publishing status, import/export, and CMS APIs when enabled by configuration and storage. The bundled CMS UI is a reference client: revision comparison, nested menu editing, media thumbnails, editorial calendars, and a full notification inbox still require application-specific UI/workflow work. Run `flaxon migrate --direction up` against the configured database before production use. See the linked guide for exact hooks, schemas, routes, and persistence configuration.

## Database adapters

```python
from flaxon.database.adapters.sqlite import SQLiteAdapter

db = SQLiteAdapter("data/app.db")
await db.connect()
await db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
await db.execute("INSERT INTO users (name) VALUES (?)", "Ada")
user = await db.fetch_one("SELECT * FROM users WHERE id = ?", 1)
await db.disconnect()
```

SQL adapters are `SQLiteAdapter` (aiosqlite), `PostgreSQLAdapter` (asyncpg), `MySQLAdapter` (aiomysql), and `SQLAlchemyAdapter` (async SQLAlchemy). `CustomAdapter` wraps an existing connection. `MongoDBAdapter` is document-native (`find_one`, `find_many`, `insert_*`, `update_*`, `delete_*`, `count`) and intentionally rejects SQL methods. `RedisAdapter` is key/value-native (`get`, `set`, hashes, lists, and sets) and intentionally rejects SQL methods. PostgreSQL, MySQL, MongoDB, Redis, and SQLAlchemy require their drivers and reachable services for live integration tests.

## Caching, tasks, events, mail, templates, and operations

`Cache` and `cached_async` provide in-memory caching; standalone filesystem and Redis backends are under `flaxon.caching.backends`. Task queues provide memory, database, and Redis backends; run `flaxon worker app:app` and `flaxon schedule app:app`. `EventRegistry` and `EventDispatcher` support sync and async listeners. `Mailer` supports console and SMTP adapters. `Jinax` provides autoescaped Jinja templates through `request.render(...)`. `TestClient` and `AsyncTestClient` cover HTTP routes; WebSockets require a real ASGI connection. Debug mode provides tracebacks and `/__debug__`. `/health`, `/health/live`, `/health/ready`, and `/metrics` are built in. Plugins use `SimplePlugin` or `Plugin`; mount ASGI apps with `app.mount_asgi(...)`.

## CLI

The CLI includes `run`, `routes`, `doctor`, `new`, `generate`, `docs`, `inspect`, `build`, `test`, `shell`, `migrate`, `schedule`, and `worker`. Use `flaxon migrate --direction up` to create or update migration-backed Admin/CMS tables.
