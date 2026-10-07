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
