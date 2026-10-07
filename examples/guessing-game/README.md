# Full-stack capstone: a guessing-game SPA

Finish the course by building and deploying a complete application: a single-page guessing game, a Python API, SQLite persistence, and protected Flaxon Admin for managing completed results.

This capstone uses **Flaxon + Teloce with feature modules**. Flaxon compiles Teloce single-file components, discovers module-owned pages, and serves a shared SPA shell. `data-teloce-link` handles client navigation. Python modules validate API requests and persist results. No Node.js build is required. The backend-only and Jinax lessons remain available for readers who choose those architectures.

## What you will build

- `/play`: start a round and guess a number from 1 to 100 in ten attempts.
- `/results`: see completed rounds played in the current browser tab.
- `/api/games/`: create rounds; token-protected endpoints read state and accept guesses.
- `/admin/game_results`: authenticated result browsing and deletion. Scores cannot be manually created or edited.
- `/healthz`: Render's health check.

The server stores the secret number, hashes the access token, and calculates every score. The browser never receives an unfinished round's answer. Completed results and Admin users survive restarts using SQLite on persistent storage.

[Download the complete project](../../downloads/flaxon-guessing-game.zip). All required files are also included below, with their exact paths.

## 1. Set up locally

Use Python 3.11 or newer and Git. Extract the download into `guessing-game/`, then open a terminal there:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

Install and initialize:

```bash
python -m pip install -r requirements.txt
python management.py migrate
python management.py createsuperuser
flaxon run app:app --reload
```

Enter your own Admin username, email, and strong password when prompted. Password input is hidden. There are no default credentials. Open <http://127.0.0.1:8000/play>. You can also start with `python -m flaxon run app:app --reload`.

The `.python-version` file selects Python 3.12 on Render and allows its latest available security patch. Keep your local Python installation updated as well.

The requirements pin the exact Flaxon and Teloce-Py Git commits used to verify this tutorial, rather than assuming that a PyPI package with the same version number contains these APIs. Upgrade the pin deliberately after running the tests.

## 2. Understand the SPA and API

The application has three Teloce pages: Home (`/`), Play (`/play`), and Results (`/results`). `ui/app.html` is the persistent shell. Its `<main data-teloce-router-view>` receives the selected page; navigation anchors use `data-teloce-link`.

Flaxon serves the shell at all three URLs, so direct links and refreshes work. Its integration builds and mounts the router automatically. Do not add another `history.pushState()` listener or mount a second router. Admin links remain ordinary anchors because Admin is a protected server-rendered area.

| Owner | Python responsibility | Teloce responsibility |
| --- | --- | --- |
| `app.py` | Configure middleware, mount modules, initialize Admin, serve the shell | Register the root `ui/` tree |
| `modules/game/` | Validate guesses and manage SQLite rounds | `ui/pages/Play.html` and the shared API helpers |
| `modules/results/` | Return token-protected completed results; register the Admin adapter | `ui/pages/Results.html` |
| `ui/` | No database or authorization code | Persistent shell and Home page |

`app.mount_module(game, prefix="/api/games")` gives `@game.post("/")` the full URL `/api/games/`. The trailing slash belongs to this endpoint. `app.mount_module(results, prefix="/api/results")` gives `@results.get("/<game_id>")` the full URL `/api/results/<game_id>`. These backend prefixes do not change the browser page URLs `/play` and `/results`.

Each `FlaxonModule(..., ui_dir=...)` contributes pages to the shared router. Keep module UI directories inside the project root. For a different page path, pass an explicit `ui_routes` mapping rather than changing API prefixes.

The shared browser helper is `modules/game/ui/client.ts`. It uses ordinary JavaScript syntax in a TypeScript-compatible file so Teloce's project builder emits the helper as `client.js` and rewrites the component imports. The component scripts remain normal JavaScript. TypeScript transpilation does not perform type checking.

`POST /api/games/` returns a random round ID and a one-time access token. Store that token only with the player's round in `sessionStorage`. Send it as `X-Game-Token` when reading or guessing. The Results page checks completed rounds through `/api/results/{id}` instead of trusting cached scores. The public round ID alone cannot authorize access. Keep the token out of URLs and logs.

`POST /api/games/{id}/guesses` accepts `{"value": 50}`. The response includes `higher`, `lower`, or `correct`, the server's attempt count, and the round outcome. The number is revealed only when a round ends. A round expires after one hour. A SQLite transaction ensures concurrent guesses cannot overwrite the attempt count.

Mutation requests require `X-Game-Client: flaxon-spa` and reject foreign browser origins. Do not add permissive CORS to this app. The custom header causes cross-origin browser requests to preflight, which this application does not permit.

## 3. Complete project files

Create each file at the path shown. The download already contains this exact structure.

### `.gitignore`

```text
.venv/
__pycache__/
data/
backups/
.env
.pytest_cache/
.flaxon/
```

### `.python-version`

```text
3.12
```

### `app.py`

```python
"""Compose the framework, feature modules, Teloce shell, and Admin."""

import os
from pathlib import Path

from flaxon import Flaxon, Request
from flaxon.middleware.trusted_hosts import TrustedHostsMiddleware
from flaxon.security.rate_limit import RateLimitMiddleware

from modules.game.module import game
from modules.results.module import results
from modules.results.admin import configure_admin

ROOT = Path(__file__).resolve().parent
PRODUCTION = os.environ.get("APP_ENV") == "production"
SECRET = os.environ.get("FLAXON_SECRET_KEY")

if PRODUCTION and (not SECRET or len(SECRET) < 32):
    raise RuntimeError("Set FLAXON_SECRET_KEY to at least 32 random characters.")

app = Flaxon("Guess the number", debug=not PRODUCTION, config={"SECRET_KEY": SECRET})
app.state.production = PRODUCTION

allowed_hosts = [] if PRODUCTION else ["localhost", "127.0.0.1", "testserver"]
allowed_hosts.extend(
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
    if host.strip()
)
if os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
    allowed_hosts.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])
if not allowed_hosts:
    raise RuntimeError("Set ALLOWED_HOSTS for the production hostname.")

app.add_middleware(TrustedHostsMiddleware, allowed_hosts=allowed_hosts)
app.add_middleware(RateLimitMiddleware, requests=120, window_seconds=60)

# Backend prefixes do not determine browser page paths.
app.mount_module(game, prefix="/api/games")
app.mount_module(results, prefix="/api/results")
app.use_teloce(project_root=ROOT, ui_dir="ui", title="Guess the number")
admin = configure_admin(app, production=PRODUCTION)


@app.get("/")
@app.get("/play")
@app.get("/results")
async def spa(request: Request):
    # Explicit SPA paths keep unknown /api and /admin URLs out of the shell.
    return await request.compile("app.html")


@app.get("/healthz")
async def health():
    return {"status": "ok"}
```

### `management.py`

```python
"""Run migrations, bootstrap Admin, and back up SQLite safely."""

import argparse
import getpass
from pathlib import Path
import sqlite3
from modules.game import storage as database


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["migrate", "createsuperuser", "backup"])
    parser.add_argument("--destination", default="backups")
    args = parser.parse_args()
    if args.command == "migrate":
        database.migrate()
        print("Game schema ready. Admin initializes its own store on startup.")
    elif args.command == "createsuperuser":
        from flaxon.admin.services import AdminAuth, AdminStore

        store = AdminStore(str(database.DATA / "admin.sqlite3"))
        username = input("Username: ").strip()
        if username in store.list("users"):
            raise SystemExit("User already exists; use Admin to manage this account.")
        email = input("Email: ").strip()
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Confirm password: "):
            raise SystemExit("Passwords do not match.")
        auth = AdminAuth(strict_permissions=True)
        user = auth.add_user(
            {
                "username": username,
                "email": email,
                "password": password,
                "roles": ["administrator"],
                "email_verified": True,
            }
        )
        store.set("users", username, user)
        print("Admin created. Sign in at /admin/login. Enable MFA in your profile.")
    else:
        directory = Path(args.destination).resolve()
        directory.mkdir(parents=True, exist_ok=True)
        from datetime import datetime, timezone

        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        for name in ("games.sqlite3", "admin.sqlite3"):
            source = database.DATA / name
            if source.exists():
                with sqlite3.connect(source) as src, sqlite3.connect(
                    directory / f"{stamp}-{name}"
                ) as dst:
                    src.backup(dst)
        print(f"Backups saved in {directory}. Copy them to separate durable storage.")


if __name__ == "__main__":
    main()
```

### `modules/__init__.py`

Create this as an empty file.

```python

```

### `modules/game/__init__.py`

Create this as an empty file.

```python

```

### `modules/game/module.py`

```python
"""Game APIs and the Play page belong to one feature module."""

import asyncio
from pathlib import Path
from urllib.parse import urlsplit

from flaxon import Request
from flaxon.http import JSONResponse
from flaxon.modules import FlaxonModule
from flaxon.validation import Schema, fields

from modules.game import storage

game = FlaxonModule("game", ui_dir=Path(__file__).parent / "ui")


class GuessInput(Schema):
    value = fields.IntField(required=True, minimum=1, maximum=100)


def is_game_client(request: Request) -> bool:
    """Require a same-origin browser client for mutation requests."""
    if request.headers.get("x-game-client") != "flaxon-spa":
        return False

    origin = request.headers.get("origin")
    if not origin:
        return True  # Command-line clients have no browser Origin header.

    origin_url = urlsplit(origin)
    production = request.app.state.production
    allowed_schemes = {"https"} if production else {"http", "https"}
    return (
        origin_url.netloc == request.headers.get("host")
        and origin_url.scheme in allowed_schemes
    )


@game.post("/")
async def start_game(request: Request):
    if not is_game_client(request):
        return JSONResponse(
            {"error": "Same-origin game client required."}, status_code=403
        )

    round_data = await asyncio.to_thread(storage.create)
    return JSONResponse(
        round_data, status_code=201, headers={"Cache-Control": "no-store"}
    )


@game.get("/<game_id>")
async def get_game(request: Request, game_id: str):
    token = request.headers.get("x-game-token", "")
    try:
        round_data = await asyncio.to_thread(storage.read, game_id, token)
        return JSONResponse(round_data, headers={"Cache-Control": "no-store"})
    except LookupError as error:
        return JSONResponse({"error": str(error)}, status_code=404)


@game.post("/<game_id>/guesses")
async def submit_guess(request: Request, game_id: str, data: GuessInput):
    if not is_game_client(request):
        return JSONResponse(
            {"error": "Same-origin game client required."}, status_code=403
        )

    token = request.headers.get("x-game-token", "")
    value = data.to_dict()["value"]
    try:
        round_data = await asyncio.to_thread(storage.guess, game_id, token, value)
        return JSONResponse(round_data, headers={"Cache-Control": "no-store"})
    except LookupError as error:
        return JSONResponse({"error": str(error)}, status_code=404)
    except ValueError as error:
        return JSONResponse({"error": str(error)}, status_code=409)
```

### `modules/game/storage.py`

```python
"""SQLite persistence; each mutation is an atomic transaction."""

from contextlib import contextmanager
import hashlib
import os
from pathlib import Path
import secrets
import sqlite3
import time

DATA = Path(os.environ.get("DATA_DIR", "data")).resolve()
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / "games.sqlite3"


@contextmanager
def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def migrate():
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, secret INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0, outcome TEXT NOT NULL DEFAULT 'playing',
            created_at INTEGER NOT NULL, completed_at INTEGER)""")


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def public(row):
    return {
        key: row[key]
        for key in ("id", "attempts", "outcome", "created_at", "completed_at")
    }


def create():
    game_id, token = secrets.token_hex(16), secrets.token_urlsafe(32)
    with connect() as db:
        # Bound stale data growth. Finished results remain available in Admin.
        db.execute(
            "DELETE FROM games WHERE outcome='playing' AND created_at < ?",
            (int(time.time()) - 3600,),
        )
        db.execute(
            "INSERT INTO games (id,token_hash,secret,created_at) VALUES (?,?,?,?)",
            (game_id, token_hash(token), secrets.randbelow(100) + 1, int(time.time())),
        )
        row = db.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
    return {**public(row), "token": token}


def access(db, game_id, token):
    row = db.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
    if not row or not secrets.compare_digest(row["token_hash"], token_hash(token)):
        raise LookupError("Game not found or token invalid.")
    return row


def read(game_id, token):
    with connect() as db:
        return public(access(db, game_id, token))


def guess(game_id, token, value):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = access(db, game_id, token)
        if row["outcome"] != "playing":
            raise ValueError("This round is finished. Start a new game.")
        if row["created_at"] < int(time.time()) - 3600:
            raise ValueError("This round expired. Start a new game.")
        attempts = row["attempts"] + 1
        outcome = (
            "won" if value == row["secret"] else "lost" if attempts >= 10 else "playing"
        )
        completed = int(time.time()) if outcome != "playing" else None
        db.execute(
            "UPDATE games SET attempts=?,outcome=?,completed_at=? WHERE id=?",
            (attempts, outcome, completed, game_id),
        )
        result = public(
            db.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
        )
        result["hint"] = (
            "correct"
            if value == row["secret"]
            else "higher" if value < row["secret"] else "lower"
        )
        if outcome != "playing":
            result["answer"] = row["secret"]
        return result
```

### `modules/game/ui/client.ts`

```typescript
// Shared browser helpers. Python still owns all rules and authorization.
const STORAGE_KEY = "guessing-game.rounds";

export function loadRounds() {
    try {
        const rounds = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(rounds) ? rounds : [];
    } catch {
        return [];
    }
}

export function saveRound(round) {
    const previousRounds = loadRounds().filter((item) => item.id !== round.id);
    // Keep one unfinished round and up to 50 recent rounds in this tab.
    const rounds = [round, ...previousRounds].filter(
        (item) => item.id === round.id || item.outcome !== "playing"
    );
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rounds.slice(0, 50)));
        return true;
    } catch {
        return false;
    }
}

export function removeRound(gameId) {
    const rounds = loadRounds().filter((round) => round.id !== gameId);
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
    } catch {
        // Gameplay can continue even when browser storage is unavailable.
    }
}

export async function requestJson(path, { method = "GET", body, token } = {}) {
    const headers = { "X-Game-Client": "flaxon-spa" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["X-Game-Token"] = token;

    const response = await fetch(path, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) {
        const message = typeof data.error === "string"
            ? data.error
            : `The request failed (${response.status}). Please try again.`;
        throw new Error(message);
    }
    return data;
}

export function startRound() {
    return requestJson("/api/games/", { method: "POST" });
}

export function readRound(round) {
    return requestJson(`/api/games/${round.id}`, { token: round.token });
}

export function sendGuess(round, value) {
    return requestJson(`/api/games/${round.id}/guesses`, {
        method: "POST",
        body: { value },
        token: round.token,
    });
}

export function readResult(round) {
    return requestJson(`/api/results/${round.id}`, { token: round.token });
}
```

### `modules/game/ui/pages/Play.html`

```html
<template>
    <section id="play-view" aria-labelledby="play-title">
        <h1 id="play-title">Guess the number</h1>
        <p>A number from 1 to 100. Ten guesses. Can you find it?</p>
        <button id="start" type="button" :disabled="busy" @click="startGame">
            {{ busy ? "Please wait…" : "Start new game" }}
        </button>
        <form id="guess-form" v-if="isPlaying" @submit.prevent="submitGuess">
            <label for="guess">Your guess</label>
            <input id="guess" type="number" min="1" max="100" required
                   inputmode="numeric" v-model="guess" :disabled="busy" />
            <button type="submit" :disabled="busy">Guess</button>
        </form>
        <p id="message" role="status" aria-live="polite">{{ message }}</p>
        <p v-if="storageWarning" class="note">{{ storageWarning }}</p>
        <a href="/results" data-teloce-link>See your completed rounds</a>
    </section>
</template>

<script>
import { loadRounds, saveRound, removeRound, startRound, readRound, sendGuess } from "../client.ts";

export default {
    data() {
        return {
            round: null,
            guess: "",
            message: "Start a game to play.",
            storageWarning: "",
            busy: false,
        };
    },
    computed: {
        isPlaying() {
            return this.round !== null && this.round.outcome === "playing";
        },
    },
    async mounted() {
        const savedRound = loadRounds().find((round) => round.outcome === "playing");
        if (!savedRound) return;

        this.busy = true;
        try {
            const serverRound = await readRound(savedRound);
            this.round = { ...savedRound, ...serverRound };
            this.rememberRound();
            this.message = serverRound.outcome === "playing"
                ? `Round restored. ${10 - serverRound.attempts} guesses left.`
                : "This round has finished. See your results or start a new game.";
        } catch (error) {
            removeRound(savedRound.id);
            this.message = `${error.message} Start a new game.`;
        } finally {
            this.busy = false;
        }
    },
    methods: {
        rememberRound() {
            if (!saveRound(this.round)) {
                this.storageWarning = "Browser storage is unavailable. Keep this page open to finish the round.";
            }
        },
        async startGame() {
            if (this.busy) return;
            this.busy = true;
            try {
                this.round = await startRound();
                this.guess = "";
                this.message = "Your number is ready. You have 10 guesses.";
                this.rememberRound();
            } catch (error) {
                this.message = error.message;
            } finally {
                this.busy = false;
            }
        },
        async submitGuess() {
            if (this.busy || !this.isPlaying) return;
            const value = Number(this.guess);
            if (!Number.isInteger(value) || value < 1 || value > 100) {
                this.message = "Enter a whole number from 1 to 100.";
                return;
            }

            this.busy = true;
            try {
                const serverRound = await sendGuess(this.round, value);
                this.round = { ...this.round, ...serverRound };
                this.guess = "";
                this.rememberRound();
                if (serverRound.outcome === "won") {
                    const unit = serverRound.attempts === 1 ? "guess" : "guesses";
                    this.message = `You won in ${serverRound.attempts} ${unit}!`;
                } else if (serverRound.outcome === "lost") {
                    this.message = `Round finished. The answer was ${serverRound.answer}.`;
                } else {
                    this.message = `Try ${serverRound.hint}. ${10 - serverRound.attempts} guesses left.`;
                }
            } catch (error) {
                this.message = error.message;
            } finally {
                this.busy = false;
            }
        },
    },
};
</script>

<style scoped>
#message { min-height: 3rem; font-weight: 600; }
</style>
```

### `modules/results/__init__.py`

Create this as an empty file.

```python

```

### `modules/results/admin.py`

```python
"""Register completed results with Flaxon's authenticated Admin."""

from flaxon.admin import AdminConfig, AdminDashboard
from flaxon.admin.registry import Registry

from modules.game import storage
from modules.results.models import GameResult


def deny_score_changes(*args) -> bool:
    return False


def configure_admin(app, *, production: bool) -> AdminDashboard:
    registry = Registry()
    result_fields = ["id", "attempts", "outcome", "created_at", "completed_at"]
    registry.register(
        GameResult,
        name="game_results",
        list_display=["id", "attempts", "outcome", "completed_at"],
        list_filter=["outcome"],
        search_fields=["id"],
        fields=result_fields,
        readonly_fields=result_fields,
        can_add=deny_score_changes,
        can_change=deny_score_changes,
    )
    return AdminDashboard(
        app,
        config=AdminConfig(site_title="Guessing Game Admin"),
        registry=registry,
        storage_path=str(storage.DATA / "admin.sqlite3"),
        upload_dir=str(storage.DATA / "uploads"),
        users=[],
        strict_permissions=True,
        cookie_secure=production,
        microservices=False,
    )
```

### `modules/results/models.py`

```python
"""Completed-result adapter for the protected Admin dashboard."""

from modules.game import storage


class GameResult:
    """Admin adapter exposes completed scores, never tokens or secret numbers."""

    @classmethod
    async def get_instances(cls):
        with storage.connect() as db:
            return [
                storage.public(row)
                for row in db.execute(
                    "SELECT * FROM games WHERE outcome != 'playing' ORDER BY completed_at DESC"
                )
            ]

    @classmethod
    async def get_instance(cls, id):
        with storage.connect() as db:
            row = db.execute(
                "SELECT * FROM games WHERE id=? AND outcome != 'playing'", (str(id),)
            ).fetchone()
            return storage.public(row) if row else None

    @classmethod
    async def delete_instance(cls, id):
        with storage.connect() as db:
            return (
                db.execute(
                    "DELETE FROM games WHERE id=? AND outcome != 'playing'", (str(id),)
                ).rowcount
                > 0
            )

    @classmethod
    async def create_instance(cls, data):
        raise PermissionError("Results are produced by gameplay only.")

    @classmethod
    async def update_instance(cls, id, data):
        raise PermissionError("Scores cannot be edited.")
```

### `modules/results/module.py`

```python
"""Results has its own API, Teloce page, and Admin adapter."""

import asyncio
from pathlib import Path

from flaxon import Request
from flaxon.http import JSONResponse
from flaxon.modules import FlaxonModule

from modules.game import storage

results = FlaxonModule("results", ui_dir=Path(__file__).parent / "ui")


@results.get("/<game_id>")
async def get_result(request: Request, game_id: str):
    token = request.headers.get("x-game-token", "")
    try:
        round_data = await asyncio.to_thread(storage.read, game_id, token)
        if round_data["outcome"] == "playing":
            return JSONResponse(
                {"error": "This round has not finished."}, status_code=409
            )
        return JSONResponse(round_data, headers={"Cache-Control": "no-store"})
    except LookupError as error:
        return JSONResponse({"error": str(error)}, status_code=404)
```

### `modules/results/ui/pages/Results.html`

```html
<template>
    <section id="results-view" aria-labelledby="results-title">
        <h1 id="results-title">Your results</h1>
        <p>Rounds played in this browser tab. Admin keeps all completed results.</p>
        <button type="button" @click="refreshResults" :disabled="loading">
            {{ loading ? "Loading…" : "Refresh results" }}
        </button>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-if="loading" role="status">Checking your results with the server…</p>
        <ul id="results-list" v-else>
            <li v-for="result in results" :key="result.id">
                {{ describeResult(result) }}
            </li>
            <li v-if="results.length === 0">No completed rounds yet.</li>
        </ul>
        <a href="/play" data-teloce-link>Play another round</a>
    </section>
</template>

<script>
import { loadRounds, readResult } from "../../../game/ui/client.ts";

export default {
    data() {
        return { results: [], loading: false, error: "" };
    },
    mounted() {
        this.refreshResults();
    },
    methods: {
        describeResult(result) {
            const outcome = result.outcome === "won" ? "Won" : "Lost";
            const unit = result.attempts === 1 ? "guess" : "guesses";
            const completed = new Date(result.completed_at * 1000).toLocaleString();
            return `${outcome} in ${result.attempts} ${unit} — ${completed}`;
        },
        async refreshResults() {
            if (this.loading) return;
            this.loading = true;
            this.error = "";
            this.results = [];
            try {
                const savedRounds = loadRounds().filter((round) => round.outcome !== "playing");
                const verifiedResults = [];
                for (const round of savedRounds) {
                    verifiedResults.push(await readResult(round));
                }
                this.results = verifiedResults;
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<style scoped>
li { padding: 0.7rem 0; }
</style>
```

### `render.yaml`

```yaml
services:
  - type: web
    name: flaxon-guessing-game
    runtime: python
    plan: starter
    numInstances: 1
    buildCommand: pip install -r requirements.txt
    startCommand: python management.py migrate && uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-proxy-headers
    healthCheckPath: /healthz
    envVars:
      - key: APP_ENV
        value: production
      - key: DATA_DIR
        value: /var/data
      - key: FLAXON_SECRET_KEY
        generateValue: true
    disk:
      name: game-data
      mountPath: /var/data
      sizeGB: 1
```

### `requirements.txt`

```text
flaxon[standard] @ git+https://github.com/Flaxon-Labs/flaxon.git@403d571eb6e35ac7a24fb9972fb2d3e3ccb19e62
teloce-py @ git+https://github.com/aldanedev-create/teloce-py.git@10f786b9ce99cf62cb2e154a913843b027b20ee7
minifyjs==0.1.3
```

### `test_game.py`

```python
import asyncio
import importlib
import sys
from pathlib import Path

import pytest
import httpx


@pytest.fixture
def game(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("APP_ENV", raising=False)
    sys.path.insert(0, str(Path(__file__).parent))
    from modules.game import storage as database

    importlib.reload(database)
    database.migrate()
    import app

    importlib.reload(app)
    global GameResult
    from modules.results.models import GameResult

    return database, app


def test_score_and_authorization(game):
    db, module = game

    async def scenario():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=module.app), base_url="http://testserver"
        ) as client:
            assert (await client.post("/api/games/")).status_code == 403
            headers = {"X-Game-Client": "flaxon-spa"}
            response = await client.post("/api/games/", headers=headers)
            assert response.status_code == 201, response.text
            data = response.json()
            url = f"/api/games/{data['id']}/guesses"
            assert "secret" not in data and "token_hash" not in data
            assert (
                await client.post(url, headers=headers, json={"value": 50})
            ).status_code == 404
            headers["X-Game-Token"] = data["token"]
            assert (
                await client.post(url, headers=headers, json={"value": 101})
            ).status_code == 422
            with db.connect() as conn:
                secret = conn.execute(
                    "SELECT secret FROM games WHERE id=?", (data["id"],)
                ).fetchone()[0]
            response = await client.post(
                url, headers=headers, json={"value": secret, "attempts": 0}
            )
            assert response.status_code == 200, response.text
            assert (
                response.json()["outcome"] == "won" and response.json()["attempts"] == 1
            )
            assert (
                await client.post(url, headers=headers, json={"value": secret})
            ).status_code == 409
            assert (
                await client.post(
                    "/api/games/", headers={**headers, "Origin": "https://evil.example"}
                )
            ).status_code == 403
            assert (await client.get("/admin/game_results")).status_code in (
                302,
                303,
                307,
                401,
                403,
            )
            for path in ("/", "/play", "/results", "/_flaxon/router.js", "/healthz"):
                assert (await client.get(path)).status_code == 200
            results = await GameResult.get_instances()
            assert len(results) == 1 and results[0]["attempts"] == 1
            assert not {"token_hash", "secret"} & results[0].keys()
            with pytest.raises(PermissionError):
                await GameResult.update_instance(data["id"], {"attempts": 0})
            assert await GameResult.delete_instance(data["id"])

    asyncio.run(scenario())


def test_ten_attempts_and_expiry(game):
    db, _ = game
    item = db.create()
    with db.connect() as conn:
        conn.execute("UPDATE games SET secret=100 WHERE id=?", (item["id"],))
    for _ in range(10):
        result = db.guess(item["id"], item["token"], 1)
    assert result["outcome"] == "lost" and result["attempts"] == 10
    with pytest.raises(ValueError):
        db.guess(item["id"], item["token"], 100)
    item = db.create()
    with db.connect() as conn:
        conn.execute("UPDATE games SET created_at=0 WHERE id=?", (item["id"],))
    with pytest.raises(ValueError):
        db.guess(item["id"], item["token"], 50)


def test_concurrent_guesses_atomic(game):
    db, _ = game
    item = db.create()
    with db.connect() as conn:
        conn.execute("UPDATE games SET secret=100 WHERE id=?", (item["id"],))
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: db.guess(item["id"], item["token"], 1), range(8)))
    assert db.read(item["id"], item["token"])["attempts"] == 8


def test_admin_login_and_result_permissions(game):
    db, module = game
    user = module.admin.auth.add_user(
        {
            "username": "owner",
            "password": "UniqueStrongPass!842",
            "roles": ["administrator"],
            "email_verified": True,
        }
    )
    module.admin.store.set("users", "owner", user)
    item = db.create()
    with db.connect() as conn:
        conn.execute("UPDATE games SET secret=50 WHERE id=?", (item["id"],))
    db.guess(item["id"], item["token"], 50)

    async def scenario():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=module.app), base_url="http://testserver"
        ) as client:
            response = await client.post(
                "/admin/login",
                data={
                    "username": "owner",
                    "password": "UniqueStrongPass!842",
                    "_csrf": module.admin.csrf_token(),
                },
            )
            assert response.status_code in (302, 303), response.text
            response = await client.get("/admin/game_results")
            assert response.status_code == 200, response.text
            assert item["id"] in response.text
            assert (await client.get("/admin/game_results/add")).status_code == 403
            assert (
                await client.get(f"/admin/game_results/{item['id']}/edit")
            ).status_code == 403
            response = await client.post(
                f"/admin/game_results/{item['id']}/delete",
                data={"_csrf": module.admin.csrf_token()},
            )
            assert response.status_code in (302, 303), response.text
            assert await GameResult.get_instance(item["id"]) is None

    asyncio.run(scenario())


def test_management_bootstrap_persists_hashed_user(game, monkeypatch):
    db, module = game
    import management

    answers = iter(["newowner", "owner@example.com"])
    monkeypatch.setattr("builtins.input", lambda prompt: next(answers))
    monkeypatch.setattr("getpass.getpass", lambda prompt: "BootstrapStrongPass!482")
    monkeypatch.setattr(sys, "argv", ["management.py", "createsuperuser"])
    management.main()
    stored = module.admin.store.list("users")["newowner"]
    assert (
        "password" not in stored
        and stored["password_hash"] != "BootstrapStrongPass!482"
    )
    importlib.reload(module)
    assert "newowner" in module.admin.auth.users


def test_production_fails_without_secret(game, monkeypatch):
    _, module = game
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("FLAXON_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="FLAXON_SECRET_KEY"):
        importlib.reload(module)
```

### `ui/app.html`

```html
<template>
    <div class="app-shell">
        <header>
            <a class="brand" href="/" data-teloce-link>Guess the number</a>
            <nav aria-label="Game navigation">
                <a href="/play" data-teloce-link>Play</a>
                <a href="/results" data-teloce-link>Your results</a>
                <a href="/admin/login">Admin</a>
            </nav>
        </header>
        <main data-teloce-router-view></main>
        <footer>Built with Flaxon modules and Teloce.</footer>
    </div>
</template>

<style>
:root {
    color-scheme: light dark;
    font-family: system-ui, sans-serif;
    color: #172338;
    background: #f3f7fc;
}
* { box-sizing: border-box; }
body { margin: 0; }
.app-shell { max-width: 52rem; margin: 4vh auto; padding: 1rem; }
header, main {
    padding: clamp(1rem, 4vw, 2rem);
    background: #fff;
    border: 1px solid #cbd5e1;
}
header { border-radius: 1rem 1rem 0 0; }
main { border-top: 0; border-radius: 0 0 1rem 1rem; min-height: 22rem; }
.brand { font-size: 1.2rem; font-weight: 800; }
h1 { font-size: clamp(2rem, 7vw, 3.4rem); line-height: 1.1; }
nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
a { color: #17638a; }
button {
    background: #17638a;
    color: #fff;
    border: 0;
    border-radius: 0.6rem;
    padding: 0.8rem 1.2rem;
    font: inherit;
    cursor: pointer;
}
button:disabled { opacity: 0.65; cursor: wait; }
form { display: flex; align-items: center; flex-wrap: wrap; gap: 0.8rem; margin-top: 1.5rem; }
input { width: 6rem; padding: 0.7rem; font: inherit; border: 1px solid #64748b; border-radius: 0.5rem; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #0ea5e9; outline-offset: 3px; }
.note, footer { color: #596779; font-size: 0.85rem; }
footer { padding: 1rem; }
@media (prefers-color-scheme: dark) {
    :root { color: #e2e8f0; background: #0b1220; }
    header, main { background: #132139; border-color: #475569; }
    a { color: #7dd3fc; }
    .note, footer { color: #b0bfd3; }
}
</style>
```

### `ui/pages/Home.html`

```html
<template>
    <section aria-labelledby="home-title">
        <h1 id="home-title">A small game. A complete stack.</h1>
        <p>Find a secret number from 1 to 100 in ten guesses.</p>
        <p>Teloce runs the pages. Flaxon modules validate guesses, save scores,
           and provide a protected Admin dashboard.</p>
        <a href="/play" data-teloce-link>Start playing</a>
    </section>
</template>
```


## 4. Manage results with Admin

1. Visit `/admin/login` and sign in with the account created by `management.py createsuperuser`.
2. Enable MFA from the profile page and keep recovery codes somewhere secure.
3. Open **GameResult** (the `game_results` registry entry). Browse completed rounds, filter by outcome, and search by round ID.
4. Delete a result when needed. Creation and editing are disabled by permission hooks and by the model adapter, so the dashboard cannot manufacture or rewrite a score.
5. Use Admin's users and roles screens to manage staff. Grant only the permissions they need; do not share the administrator account.

The adapter exposes no secret numbers, token hashes, or active rounds. Admin sessions and users are stored in `DATA_DIR/admin.sqlite3`. Gameplay resides in `DATA_DIR/games.sqlite3`.

If you create another Admin while the application is running, restart the process so it loads the updated user store. Do not commit the data directory or passwords.

## 5. Run the tests

```bash
python -m pip install pytest httpx
python -m pytest test_game.py -q
```

The tests cover access tokens, validation, server-owned scores, foreign-origin rejection, protected Admin, deep links, generated Teloce assets and module routes, ten-attempt losses, expiration, concurrent guesses, and the read/delete Admin adapter.

Play through a round yourself. Switch between Play and Your results, use Back/Forward, refresh `/results`, and verify that Admin shows the completed result. Opening a new browser tab intentionally starts a separate local history.

## 6. Deploy to Render

This example uses a **paid web service with a persistent disk**, one instance, and one Uvicorn worker. Render's free filesystem does not persist these SQLite files across redeploys. Review current pricing before creating a service.

1. Copy this project into the root of your own GitHub repository. Commit the application files and `render.yaml`, excluding `.venv`, `data`, secrets, and backups.
2. In Render, choose **New → Blueprint**, connect that repository, and select the supplied `render.yaml`. If you keep the example inside a larger repository, set the service's root directory to its folder instead.
3. Review the Starter service and 1 GB disk before applying the Blueprint. `DATA_DIR=/var/data` stores both databases and uploads under the persistent mount.
4. Render generates `FLAXON_SECRET_KEY`. `APP_ENV=production` disables debug mode and makes Admin cookies Secure. Render's `RENDER_EXTERNAL_HOSTNAME` supplies the trusted hostname. For a custom domain, add it to `ALLOWED_HOSTS` as a comma-separated hostname list, with no scheme or path.
5. The build installs dependencies. Flaxon compiles the root and module-owned Teloce trees at startup, emits their shared router and CSS, and serves them at `/_flaxon`. Production compilation uses MinifyJS and asset hashing. Keep `.flaxon/` writable and exclude it from Git. The **start command** runs migrations before Uvicorn listens on `0.0.0.0:$PORT`. Persistent disks are unavailable during build and pre-deploy commands, so do not move SQLite migration there.
6. Wait for `/healthz` to become healthy, then open `https://YOUR-SERVICE.onrender.com/play`.
7. In the running service's **Shell**, run `python management.py createsuperuser`. The shell can access the mounted disk. Restart the service after creating the account, then log in through the HTTPS URL at `/admin/login`.
8. Play a round, inspect its completed result in Admin, redeploy, and verify that the result and account remain available.

The start command disables proxy-header trust. This avoids trusting arbitrary forwarded client IPs; the included rate limiter may therefore group requests by the proxy's address. Before public traffic, configure rate limiting at your trusted edge, or configure Uvicorn's forwarded-header allowlist for the actual trusted proxy network. Do not use an unrestricted forwarded-header allowlist as a shortcut.

Persistent disks limit this deployment to a single instance and introduce a short interruption during redeployment. To scale horizontally, migrate gameplay and Admin persistence to shared database/session infrastructure and test the new topology.

Official references: [Render persistent disks](https://render.com/docs/disks), [Blueprint configuration](https://render.com/docs/blueprint-spec), and [deployment commands](https://render.com/docs/deploys).

## 7. Production operations

- Keep production debug disabled, use HTTPS, restrict trusted hosts, and keep same-origin API requests.
- Configure edge request limits and monitor 429 responses. The example's in-process limiter resets on restart and is not a distributed abuse-prevention system.
- Set a result-retention policy and delete old results through Admin or an audited maintenance command. Expired unfinished games are pruned when a new round is created; finished results remain until deleted.
- Back up both databases using `python management.py backup --destination /var/data/backups`. This uses SQLite's backup API rather than copying live WAL files. Move the backup files to separate durable storage; a copy on the same disk is not sufficient disaster recovery.
- Test restoration in a separate environment, monitor disk usage, and review Admin users and MFA periodically.
- Keep dependencies and the framework pin updated after testing. Add logging, alerts, and load tests for your expected traffic before a public launch.

## Troubleshooting

**Missing table:** run `python management.py migrate` in the same environment and `DATA_DIR` as the application.

**Admin login fails after bootstrap:** restart the process; verify the command ran against the persistent disk, not a local or build environment.

**403 from gameplay:** include `X-Game-Client: flaxon-spa`, keep the frontend and API on the same origin, and verify the deployment hostname. Use HTTPS in production.

**404 from a round:** its token is missing/incorrect, or an expired unfinished round has been pruned. Start a new game.

**Results vanish after redeploy:** check that both SQLite files are under `/var/data` and that the persistent disk is attached.

**Deep links fail:** deploy as the Python web service, not as a static site. Flaxon serves the compiled Teloce shell at `/play` and `/results`.

You now have a complete SPA with a protected administration interface and a reproducible deployment. Continue improving it with reusable Teloce components, account-based history, accessibility tests, or a shared production database when those features fit your application.

[Next lesson: Teloce and Flaxon API guide](12-teloce-flaxon-apis.html) · [Course contents](index.html)
