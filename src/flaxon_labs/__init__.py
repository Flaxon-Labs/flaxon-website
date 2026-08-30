from __future__ import annotations

from pathlib import Path

from .config import Settings


def create_app():
    from flaxon import Flaxon
    from flaxon.jinax import Jinax

    settings = Settings.from_env()
    app = Flaxon("flaxon-labs", debug=settings.debug)
    app.settings = settings
    app.use_templates(Jinax(str(settings.template_dir), auto_reload=settings.debug, strict_undefined=True))
    app.mount_static("/static", str(settings.static_dir))
    # The framework Admin templates use /static/admin/...; mount that subtree
    # explicitly because the website's public /static mount takes precedence.
    import flaxon.admin as flaxon_admin
    admin_static = Path(flaxon_admin.__file__).resolve().parent / "static" / "admin"
    app.mount_static("/static/admin", str(admin_static))

    from .database import create_database
    from .admin.setup import setup_admin
    from .cms.setup import setup_cms
    from .routes.public import register_public_routes
    from .routes.api import register_api_routes
    from .admin.routes import register_custom_admin_routes
    from .services.community import CommunityStore
    from .services.github import GitHubClient

    database = create_database(settings)
    app.database = database
    app.on_startup(database.initialize)
    app.on_shutdown(database.close)
    community_store = CommunityStore(database)
    app.community_store = community_store
    app.github = GitHubClient(settings.github_org, settings.github_token)
    app.on_startup(community_store.initialize)
    admin = setup_admin(app, settings, database)
    cms = setup_cms(app, settings, database, admin)
    app.flaxon_labs_admin = admin
    app.flaxon_labs_cms = cms
    register_public_routes(app, cms, settings, community_store)
    register_api_routes(app, cms, settings)
    register_custom_admin_routes(app, admin, cms, settings)
    return app


__all__ = ["create_app"]
