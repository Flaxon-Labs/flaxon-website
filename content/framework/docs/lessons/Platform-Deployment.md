# Deploying Flaxon Apps

A note on how this doc is sourced, since deployment platforms change
their behavior over time: claims about Flaxon itself (ASGI compliance,
the module system, the serverless-detection pattern) were built and
tested in this environment, including a simulated real Lambda event
handled end to end. Claims specific to Vercel's and AWS's current
platform behavior (entrypoint detection, timeouts, framework detection)
are sourced from each platform's own current documentation, not
memorized -- check the linked pages if something has changed since.

## Why this works at all: Flaxon apps are plain ASGI apps

`Flaxon` implements the ASGI protocol directly --
`async def __call__(self, scope, receive, send)` -- with no framework-
specific glue in between. That means any host that can run a standard
ASGI application can run a Flaxon app, without Flaxon needing its own
special integration for each one. This is verified, not assumed: a
bare `Flaxon` app was wrapped with `Mangum` (the standard AWS Lambda
ASGI adapter) and handled a simulated real Lambda/API Gateway event
correctly, with zero Flaxon-side changes.

---

# Vercel

Per Vercel's current docs, the Python runtime auto-detects a supported
framework from `requirements.txt`/`pyproject.toml`/`Pipfile`, and looks
for an ASGI or WSGI application object named `app` in one of these
entrypoint files: `app.py`, `index.py`, `server.py`, `main.py`,
`wsgi.py`, or `asgi.py` (or a custom path via `tool.vercel.entrypoint`
in `pyproject.toml`). ASGI apps are supported natively -- Vercel's own
docs describe the Python runtime as running "ASGI and WSGI applications
including FastAPI, Flask, Django, and other Python web frameworks."

Conveniently, Flaxon's own `flaxon new` scaffold already generates
`app.py` with a top-level `app = Flaxon(...)` -- one of Vercel's
default entrypoints, no restructuring needed for the basic case.

## Minimal setup

```
myapp/
├── app.py              # exposes `app` -- Vercel finds this automatically
├── requirements.txt
└── vercel.json
```

```python
# app.py
from flaxon import Flaxon

app = Flaxon("myapp")

@app.get("/")
async def home():
    return {"message": "Hello from Flaxon on Vercel"}
```

```
# requirements.txt
flaxon
```

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/app.py" }]
}
```

Deploy with `vercel deploy` or by connecting the repo through the
Vercel dashboard/CLI.

## What actually needs adapting for Vercel specifically

Nothing Flaxon-side needs a code adapter to *run* on Vercel -- the app
object works as-is. What genuinely needs attention is Vercel's
*execution model*, which is meaningfully different from a long-running
server. This is the part worth being careful about:

### 1. WebSocket-dependent modules should not be mounted on Vercel

Per Vercel's own current documentation, standard Vercel Functions are
short-lived and stateless, and WebSockets are explicitly called out as
unreliable in that model. If you've built anything with Flaxon's
WebSocket support (live-updating admin panels, the CMS live feed from
earlier in this project, chat features), don't mount those routes when
deploying to Vercel -- detect the environment and skip them:

```python
import os
from flaxon import Flaxon
from flaxon.modules import FlaxonModule

IS_SERVERLESS = bool(os.environ.get("VERCEL"))

app = Flaxon("myapp")

api = FlaxonModule("api")

@api.get("/ping")
async def ping():
    return {"pong": True}

app.mount_module(api, prefix="/api")

if not IS_SERVERLESS:
    live = FlaxonModule("live")

    @live.websocket("/updates")
    async def updates(socket):
        await socket.accept()
        # ... live updates ...

    app.mount_module(live, prefix="/live")
```

Verified: the same app object built with `VERCEL` set vs. unset
correctly includes or excludes the WebSocket route, while the HTTP
routes work identically either way. Vercel sets `VERCEL=1` in its
Function environment automatically -- no manual configuration needed
to detect it.

### 2. Don't rely solely on `on_startup` for critical initialization

Flaxon's `@app.on_startup` hooks fire on the ASGI lifespan protocol.
Whether a given serverless host reliably drives that protocol the same
way a long-running server does is host-specific and not something to
assume — as a defensive measure for any serverless target, do critical
setup (e.g. opening a DB connection) at module level too, so it runs
on every cold start regardless of whether lifespan events fire the way
they would locally under `flaxon run`:

```python
from flaxon.database.manager import DatabaseManager
from flaxon.database.adapters.postgresql import PostgreSQLAdapter

db = DatabaseManager(PostgreSQLAdapter(...))
app.container.register_instance("db", db)

# Also keep the normal hook for local dev / hosts that do drive lifespan:
@app.on_startup
async def setup():
    await db.initialize()
```

### 3. Real limits to plan around (from Vercel's current docs)

- Execution timeout: 10 seconds on the free plan, 60 seconds on Pro
  (longer with Fluid Compute, which has its own pricing model -- check
  current Vercel docs before relying on it)
- No persistent background processes or workers in the standard model
  -- Flaxon's `flaxon worker`/`flaxon schedule` CLI commands assume a
  long-running process and don't fit this model at all; run those on a
  different host (see below) if you need them
- Bundle size: 500MB standard, up to 5GB on the "Large Functions"
  beta -- relevant if your `requirements.txt` pulls in heavy DB
  drivers

---

# AWS Lambda (via Mangum)

Unlike Vercel, AWS Lambda doesn't natively speak ASGI -- it needs an
adapter to translate Lambda/API Gateway events into ASGI scope/receive/
send calls. [Mangum](https://mangum.fastapiexpert.com/) is the
standard tool for this, framework-agnostic, and was verified here to
correctly wrap a real Flaxon app and handle a simulated API Gateway
event end to end.

```python
# lambda_handler.py
from flaxon import Flaxon
from mangum import Mangum

app = Flaxon("myapp")

@app.get("/hello")
async def hello():
    return {"message": "from flaxon on lambda"}

handler = Mangum(app, lifespan="off")
```

```
pip install mangum
```

Set the Lambda function's handler to `lambda_handler.handler`. Point
API Gateway (HTTP API, for simplicity) at the function.

`lifespan="off"` is the safer default here for the same reason as the
Vercel note above -- do critical initialization at module level, not
solely inside `@app.on_startup`, since Lambda's relationship to the
lifespan protocol is adapter-mediated rather than native. Same
serverless caveats apply as Vercel: no long-running `flaxon worker`/
`flaxon schedule`, WebSockets need API Gateway's separate WebSocket API
(more setup than the REST/HTTP API path, not covered here).

If you'd rather avoid Lambda's event-translation model entirely, AWS
App Runner or ECS Fargate run a normal container with a normal
long-running ASGI server -- see "Container-based hosting" below; no
Mangum needed, same as any other container host.

---

# Platforms with normal, long-running processes

These are the simplest deployment targets for Flaxon, since nothing
needs adapting at all -- Flaxon apps run exactly the way they do
locally, WebSockets and background workers included.

## Fly.io / Railway / Render (recommended if you use WebSockets)

All three run your app as a normal long-running process from a
Dockerfile or buildpack. This is the right choice for anything using
Flaxon's WebSocket features, `flaxon worker`, or `flaxon schedule`,
none of which fit a serverless execution model.

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -e . uvicorn[standard]

EXPOSE 8000
CMD ["flaxon", "run", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Fly.io: `fly launch` detects the Dockerfile and deploys it.
Railway/Render: connect the repo, both auto-detect a Dockerfile.

## Any VPS / bare server

Same Dockerfile works standalone (`docker run -p 8000:8000 myapp`), or
skip Docker entirely and run `flaxon run app:app --host 0.0.0.0 --port 8000`
behind a reverse proxy (nginx/Caddy) for TLS termination. For
production, prefer running under a process manager (systemd, or
multiple Uvicorn workers via `--workers` if `flaxon run` exposes it,
otherwise invoke `uvicorn app:app` directly with `--workers N`) rather
than a single foreground process.

---

# Choosing a platform

| Need | Best fit |
|---|---|
| Simple API, no WebSockets, want zero-config | Vercel |
| Existing AWS infrastructure, comfortable with Lambda | AWS Lambda + Mangum |
| WebSocket features (CMS live updates, chat, etc.) | Fly.io / Railway / Render / any container host -- not Vercel or Lambda's REST path |
| `flaxon worker` / `flaxon schedule` background processes | Any long-running host -- not serverless |
| Full control, existing ops setup | Docker on a VPS |

If you're not sure yet, start with Fly.io/Railway/Render: nothing
about your Flaxon app needs to change later if you decide to add
WebSocket features, since you're not fighting a serverless execution
model to begin with.