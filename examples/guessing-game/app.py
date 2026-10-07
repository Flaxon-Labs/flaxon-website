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
