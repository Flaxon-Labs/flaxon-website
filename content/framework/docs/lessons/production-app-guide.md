# Building a Production App with Modules

A guide to structuring a real, multi-domain Flaxon app around
`FlaxonModule` -- file layout, an auto-mounting convention that keeps
`app.py` from growing every time you add a feature, and the developer-
experience tooling Flaxon already has that's worth wiring in from day
one. Every piece of this has been built and run end to end, including
the gotchas.

---

# Recommended file structure

```
myapp/
├── app.py                    # entry point: builds the app, wires dependencies, mounts modules
├── pyproject.toml            # dependencies + pytest config (see "Testing" below)
├── .env                      # local secrets, gitignored
├── .env.example              # checked in, documents what .env needs
├── .gitignore
│
├── modules/
│   ├── __init__.py           # empty -- just makes this a package
│   ├── loader.py             # auto-discovers and mounts every module below
│   │
│   ├── core/
│   │   └── __init__.py       # health/status endpoints, no url prefix
│   │
│   ├── users/
│   │   ├── __init__.py       # defines `module = FlaxonModule("users")` + routes
│   │   ├── repository.py     # DB access, kept out of route handlers
│   │   ├── templates/
│   │   └── static/
│   │
│   └── posts/
│       ├── __init__.py
│       └── repository.py
│
├── cli/
│   └── seed.py                # module-owned CLI commands, e.g. `flaxon seed`
│
├── migrations/                 # flaxon migrate reads from here
│
└── tests/
    ├── test_users_module.py    # ModuleTestClient -- no full app needed
    └── test_app.py             # full-app integration tests via AsyncTestClient
```

One module = one folder = one domain area. Each module's `__init__.py`
exposes a single module-level `FlaxonModule` instance named `module` --
that convention is what makes the auto-mounting loader below possible.

---

# The auto-mounting convention (the main DX win)

Without this, every new feature means editing `app.py` to add another
`app.mount_module(...)` call. With it, adding a feature is "add a
folder" -- `app.py` never changes.

```python
# modules/loader.py
"""Auto-discovers and mounts every module in this package.

Convention: each subdirectory under modules/ is a package whose
__init__.py exposes a module-level FlaxonModule instance named `module`.
"""
import importlib
import pkgutil


def mount_all(app, prefix_base: str = "/api") -> None:
    package = importlib.import_module("modules")
    for _, name, is_pkg in pkgutil.iter_modules(package.__path__):
        if not is_pkg:
            continue
        sub = importlib.import_module(f"modules.{name}")
        mod = getattr(sub, "module", None)
        if mod is None:
            continue
        prefix = "" if name == "core" else f"{prefix_base}/{name}"
        app.mount_module(mod, prefix=prefix)
```

```python
# modules/users/__init__.py
from flaxon.modules import FlaxonModule
from flaxon.exceptions import NotFound

module = FlaxonModule("users")
module.requires("db")

@module.get("/")
async def list_users(db):
    return await db.fetch_all("SELECT * FROM users")

@module.get("/<int:user_id>")
async def get_user(user_id: int, db):
    user = await db.fetch_one("SELECT * FROM users WHERE id = ?", user_id)
    if not user:
        raise NotFound(f"No user with id {user_id}")
    return user
```

```python
# modules/posts/__init__.py
from flaxon.modules import FlaxonModule

module = FlaxonModule("posts")
module.requires("db")

@module.get("/")
async def list_posts(db):
    return await db.fetch_all("SELECT * FROM posts")
```

```python
# modules/core/__init__.py
from flaxon.modules import FlaxonModule

module = FlaxonModule("core")

@module.get("/status")
async def status():
    return {"status": "ok"}
```

`core` is treated specially -- mounted with no prefix, since health/
status endpoints are conventionally at the app root, not under `/api`.
Adjust that rule for your own conventions; the point is the loader
makes the rule enforceable in one place instead of scattered across
every `mount_module()` call.

---

# app.py

```python
from flaxon import Flaxon
from flaxon.database.manager import DatabaseManager
from flaxon.database.adapters.sqlite import SQLiteAdapter
from modules.loader import mount_all

app = Flaxon(
    "myapp",
    config={"SECRET_KEY": "change-me-in-production"},
    debug=True,
)

db = DatabaseManager(SQLiteAdapter(database=app.config.get("DATABASE_PATH", "app.db")))
app.container.register_instance("db", db)

mount_all(app)


@app.on_startup
async def setup_db():
    await db.initialize()
    await db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")
    await db.execute("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, title TEXT)")


@app.on_shutdown
async def teardown_db():
    await db.close()
```

Note the order: register dependencies in `app.container` **before**
`mount_all(app)` runs, since `requires()` validation happens at mount
time -- a module mounted before its dependency is registered fails
immediately with a clear `ModuleDependencyError`, which is the point.

**Real gotcha, found while building this:** an `aiosqlite`-backed
connection left open when a script/event loop exits can hang the
interpreter indefinitely instead of exiting cleanly. Always pair
`db.initialize()` in `on_startup` with `db.close()` in `on_shutdown` --
under `flaxon run`, the real ASGI lifespan protocol fires both
correctly, so this is only a trap in ad-hoc scripts/REPL experiments
that don't go through the real lifespan.

---

# Config and environments

`Flaxon`'s built-in `Config` reads any `FLAXON_`-prefixed environment
variable automatically, with type coercion (`"true"`/`"false"` become
real booleans, comma-separated values become lists):

```bash
# .env
FLAXON_ENV=development
FLAXON_DEBUG=true
FLAXON_SECRET_KEY=dev-only-do-not-use-in-prod
FLAXON_ALLOWED_HOSTS=localhost,127.0.0.1
```

```bash
flaxon run app:app --env-file .env --reload
```

`--env-file` uses `python-dotenv` under the hood -- it's not a hard
Flaxon dependency, so add it yourself: `pip install python-dotenv`.

In code, check environment with the real helpers rather than
string-comparing `app.config["ENV"]` yourself:

```python
if app.config.is_production():
    ...
elif app.config.is_development():
    ...
```

`.env.example` (checked into git, documents what production needs
without leaking real secrets):

```bash
FLAXON_ENV=production
FLAXON_DEBUG=false
FLAXON_SECRET_KEY=
FLAXON_ALLOWED_HOSTS=yourdomain.com
```

---

# CLI commands

```python
# cli/seed.py
from flaxon.modules import FlaxonModule

seed_mod = FlaxonModule("seed_cli")

@seed_mod.cli_command("seed", help_text="Seed demo users and posts")
async def seed(console):
    from flaxon.database.manager import DatabaseManager
    from flaxon.database.adapters.sqlite import SQLiteAdapter

    db = DatabaseManager(SQLiteAdapter(database="app.db"))
    await db.initialize()
    await db.execute("INSERT INTO users (name) VALUES (?)", "Demo User")
    await db.close()
    console.info("Seeded 1 demo user.")

seed_mod.install_cli_commands(globals())
```

```bash
flaxon --help    # "seed" shows up
flaxon seed      # runs it
```

Use `cli/*.py`, not a `flaxon_cli.py` at the project root, for this --
verified the project-root path silently finds nothing when run through
the installed `flaxon` command unless you've specifically patched
`discovery.py`'s `sys.path` handling. `cli/*.py` works regardless, no
patch needed.

---

# Testing

## Isolated module tests (fast, no full app)

```python
# tests/test_users_module.py
import pytest
from flaxon.modules import FlaxonModule, ModuleDependencyError, ModuleTestClient


@pytest.mark.asyncio
async def test_requires_db_dependency():
    fresh = FlaxonModule("users")
    fresh.requires("db")

    @fresh.get("/")
    async def h(db):
        return []

    with pytest.raises(ModuleDependencyError):
        ModuleTestClient(fresh)
```

## Full-app integration tests

```python
# tests/test_app.py
import pytest
from flaxon.testing.client import AsyncTestClient
import app as m


@pytest.mark.asyncio
async def test_status():
    await m.app.lifecycle.startup()
    client = AsyncTestClient(m.app)
    response = await client.request("GET", "/status")
    assert response.status_code == 200
    await m.db.close()
```

## The real gotcha you need `pyproject.toml` for

`flaxon test` runs `pytest` as a **separate subprocess** -- this does
NOT get your project root added to `sys.path` the way `python -m pytest`
does (verified: `from modules.users import module` fails under
`flaxon test` without this, works fine under plain
`python -m pytest tests/`). Fix it once, in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
asyncio_mode = "auto"
```

With that in place, both `flaxon test` and `pytest` directly work
identically.

```bash
flaxon test --coverage --keep-env
```

---

# Migrations

```bash
python3 -c "
from flaxon.admin import write_admin_migration
write_admin_migration('migrations')
"
flaxon migrate --database "sqlite://./app.db" --migrations-dir migrations
flaxon migrate --database "sqlite://./app.db" --migrations-dir migrations --status
```

Works the same way for Postgres/MySQL via `--database postgresql://...`
or `--database mysql://...`.

---

# Developer-experience tooling worth wiring in from day one

These already exist in Flaxon -- they cost nothing to use, and catch
real problems before they reach production:

```bash
flaxon run app:app --reload            # auto-reload on file changes, for local dev
flaxon routes app:app                  # confirms every module mounted where you expect
flaxon doctor app:app                  # catches duplicate routes, weak/missing SECRET_KEY
flaxon doctor app:app --fix            # generates a real SECRET_KEY into .env if missing
```

Run `flaxon routes app:app` after adding a new module -- it's the
fastest way to confirm the auto-mount loader actually picked it up and
prefixed it correctly, without needing to hit the server manually:

```
GET     /status                   status
GET     /api/posts/               list_posts
GET     /api/users/               list_users
GET     /api/users/<int:user_id>  get_user
```

`debug=True` also gets you a live debug dashboard at `/__debug__` and
`/health`, `/health/live`, `/health/ready`, `/metrics` for free --
useful behind a load balancer's health checks even before you've built
any of your own monitoring.

---

# Summary checklist for a new production app

- [ ] One folder per domain under `modules/`, each exposing `module = FlaxonModule(...)`
- [ ] `modules/loader.py` auto-mounts everything -- `app.py` stays small as you grow
- [ ] Dependencies registered in `app.container` **before** `mount_all(app)` runs
- [ ] `db.close()` paired with every `db.initialize()`, in `on_shutdown`
- [ ] `.env` for local secrets, `.env.example` checked in, `--env-file` on `flaxon run`
- [ ] `pyproject.toml` has `pythonpath = ["."]` under `[tool.pytest.ini_options]`
- [ ] CLI commands live in `cli/*.py`, not `flaxon_cli.py`
- [ ] `flaxon routes app:app` and `flaxon doctor app:app` run as a sanity check after any structural change