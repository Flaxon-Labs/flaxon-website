from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flaxon.http import HTMLResponse, JSONResponse, Request

from ..config import Settings


def register_custom_admin_routes(app: Any, admin: Any, cms: Any, settings: Settings) -> None:
    async def page(request: Request, page_name: str):
        user = await admin._require_user(request, "admin:read")
        await cms._load_database()
        counts = {name: content.stats() for name, content in cms.content_types.items()}
        community_counts = await app.community_store.counts() if page_name == "community" else {}
        community_messages = await app.community_store.list_messages() if page_name == "community" else []
        community_subscribers = await app.community_store.list_subscribers() if page_name == "community" else []
        content_name = {"projects": "project", "documentation": "page", "releases": "release"}.get(page_name)
        content_items = list(cms.content_types[content_name].items.values()) if content_name else []
        return await request.render(
            f"admin/{page_name}.html",
            {"user": user, "counts": counts, "community_counts": community_counts, "community_messages": community_messages, "community_subscribers": community_subscribers, "content_items": content_items, "content_name": content_name, "config": admin.config, "models": admin.registry.get_all(), "cms_url": "/admin/cms/", "dashboard": admin},
        )

    for name in ("projects", "documentation", "releases", "community"):
        app.router.route(f"/admin/labs/{name}", methods={"GET"}, name=f"labs_{name}")(lambda request, page_name=name: page(request, page_name))

    async def settings_page(request: Request):
        user = await admin._require_user(request, "admin:read" if request.method == "GET" else "admin:settings")
        if request.method == "POST":
            form = await request.form()
            data = form.to_dict() if hasattr(form, "to_dict") else dict(form)
            admin.validate_csrf(data)
            title = str(data.get("site_title", "")).strip()
            header = str(data.get("site_header", "")).strip()
            timezone = str(data.get("timezone", "UTC")).strip()
            if not title or len(title) > 160 or not header or len(header) > 160 or len(timezone) > 64:
                return JSONResponse({"error": "Enter valid site title, header, and timezone values."}, status_code=422)
            admin.config.site_title = title
            admin.config.site_header = header
            admin.config.timezone = timezone or "UTC"
            admin.record_activity("settings_updated", "organization_settings", request, site_title=title, site_header=header, timezone=timezone or "UTC")
            await admin._persist_database()
        return await page(request, "settings")

    app.router.route("/admin/labs/settings", methods={"GET", "POST"}, name="labs_settings")(settings_page)

    async def update_message(request: Request):
        await admin._require_user(request, "admin:write")
        form = await request.form()
        data = form.to_dict() if hasattr(form, "to_dict") else dict(form)
        admin.validate_csrf(data)
        try:
            updated = await app.community_store.update_message_status(str(data.get("message_id", "")), str(data.get("status", "")))
        except ValueError as exc:
            return JSONResponse({"error": str(exc)}, status_code=422)
        if updated:
            admin.record_activity("community_message_status", "contact_message", request, str(data.get("message_id", "")), status=str(data.get("status", "")))
            await admin._persist_database()
        return JSONResponse({"updated": updated})

    app.router.route("/admin/labs/community/messages/status", methods={"POST"}, name="labs_community_message_status")(update_message)

    async def community_data(request: Request):
        await admin._require_user(request, "admin:read")
        return JSONResponse({"messages": await app.community_store.list_messages(200), "subscribers": await app.community_store.list_subscribers(500)})

    app.router.route("/admin/labs/community/data", methods={"GET"}, name="labs_community_data")(community_data)

    async def community_export(request: Request):
        await admin._require_user(request, "admin:read")
        payload = {"exported_at": datetime.now(timezone.utc).isoformat(), "messages": await app.community_store.list_messages(200), "subscribers": await app.community_store.list_subscribers(500)}
        return JSONResponse(payload, headers={"content-disposition": "attachment; filename=flaxon-community.json"})

    app.router.route("/admin/labs/community/export", methods={"GET"}, name="labs_community_export")(community_export)

    async def health(request: Request):
        await admin._require_user(request, "admin:read")
        database_ok = await settings_database_ping(app)
        return JSONResponse({"ok": database_ok, "database": "ok" if database_ok else "unavailable", "environment": "production" if not settings.debug else "development"})

    app.router.route("/admin/labs/health", methods={"GET"}, name="labs_health")(health)


async def settings_database_ping(app: Any) -> bool:
    database = getattr(app, "database", None)
    if database is None:
        return False
    try:
        return bool(await database.pool.ping()) if hasattr(database.pool, "ping") else bool(await database.fetch_val("SELECT 1"))
    except Exception:
        return False
