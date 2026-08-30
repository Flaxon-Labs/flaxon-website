from __future__ import annotations

from typing import Any

from flaxon.http import JSONResponse, Request


def register_api_routes(app: Any, cms: Any, settings: Any) -> None:
    @app.get("/api/projects")
    async def projects_api(request: Request):
        await cms._load_database()
        items = [item for item in cms.content_types["project"].items.values() if item.get("status") == "published"]
        return JSONResponse({"items": items})

    @app.get("/api/health")
    async def health_api(request: Request):
        database_ok = False
        try:
            database = getattr(app, "database", None)
            database_ok = bool(await database.pool.ping()) if database is not None and hasattr(database.pool, "ping") else bool(database and await database.fetch_val("SELECT 1"))
        except Exception:
            database_ok = False
        payload = {"ok": database_ok, "service": "flaxon-labs", "environment": "production" if not settings.debug else "development", "checks": {"database": database_ok, "blob_configured": bool(settings.blob_token and settings.blob_public_url), "redis_configured": bool(settings.redis_url), "github_configured": bool(settings.github_org)}}
        return JSONResponse(payload, status_code=200 if database_ok else 503)

    @app.get("/api/github/projects")
    async def github_projects_api(request: Request):
        try:
            repositories = await app.github.repositories()
            return JSONResponse({"items": repositories})
        except Exception as exc:
            return JSONResponse({"error": "GitHub is temporarily unavailable.", "detail": str(exc) if settings.debug else None}, status_code=503)

    @app.get("/api/github/releases/<repository>")
    async def github_releases_api(request: Request, repository: str):
        if "/" in repository or not repository.strip():
            return JSONResponse({"error": "Invalid repository."}, status_code=422)
        try:
            return JSONResponse({"items": await app.github.releases(repository)})
        except Exception as exc:
            return JSONResponse({"error": "GitHub is temporarily unavailable.", "detail": str(exc) if settings.debug else None}, status_code=503)

    @app.post("/api/community/subscribe")
    async def subscribe_api(request: Request):
        try:
            data = await request.json() or {}
            client = request.scope.get("client") or ("", 0)
            return JSONResponse(await app.community_store.subscribe(data.get("email", ""), ip_address=str(client[0])), status_code=201)
        except ValueError as exc:
            return JSONResponse({"error": str(exc)}, status_code=422)

    @app.post("/api/contact")
    async def contact_api(request: Request):
        try:
            data = await request.json() or {}
            client = request.scope.get("client") or ("", 0)
            data["ip_address"] = str(client[0])
            data["user_agent"] = request.headers.get("user-agent", "")
            return JSONResponse(await app.community_store.contact(data), status_code=201)
        except ValueError as exc:
            return JSONResponse({"error": str(exc)}, status_code=422)
