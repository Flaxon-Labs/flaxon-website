from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from flaxon.admin import AdminConfig, AdminDashboard, PostgreSQLAdminStore

from ..config import Settings
from ..services.media_storage import VercelBlobStorage
from ..services.email import SMTPMailer


def setup_admin(app: Any, settings: Settings, database: Any) -> AdminDashboard:
    blob = None
    if settings.blob_token:
        blob = VercelBlobStorage(settings.blob_token, settings.blob_public_url)
    reset_mailer = None
    verification_mailer = None
    if settings.smtp_host and settings.smtp_from:
        mailer_args = (settings.smtp_host, settings.smtp_port, settings.smtp_from, settings.smtp_username, settings.smtp_password, settings.smtp_tls, settings.site_url)
        reset_mailer = SMTPMailer(*mailer_args, action_path="password-reset")
        verification_mailer = SMTPMailer(*mailer_args, action_path="verify-email")
    postgres_store = PostgreSQLAdminStore(settings.database_url) if settings.database_url else None
    if postgres_store is not None:
        app.on_shutdown(postgres_store.close)
    upload_dir = Path(settings.data_dir) / "uploads"
    admin = AdminDashboard(
        app,
        config=AdminConfig(
            site_title="Flaxon Labs Admin",
            site_header="Flaxon Labs",
            index_title="Organization operations",
            timezone="UTC",
            settings={"organization": "Flaxon Labs", "head": "Aldane Hutchinson"},
        ),
        url_prefix="/admin",
        template_dir=str(settings.template_dir),
        database=database,
        store=postgres_store,
        redis_url=settings.redis_url,
        redis_protocol=2,
        redis_max_connections=100,
        session_idle_timeout=8 * 60 * 60,
        password_reset_sender=reset_mailer,
        email_verification_sender=verification_mailer,
        storage_path=None if postgres_store else str(settings.admin_storage_path),
        upload_dir=str(upload_dir),
        media_storage=blob,
        users=[
            {
                "username": os.getenv("FLAXON_ADMIN_USERNAME", "aldane"),
                "password": os.getenv("FLAXON_ADMIN_PASSWORD", "ChangeThis123!"),
                "email": os.getenv("FLAXON_ADMIN_EMAIL", "aldane@flaxonlabs.dev"),
                "roles": ["administrator"],
            }
        ],
    )

    # Login can be the first request on a serverless worker. Load Neon-backed
    # users before the framework authentication handler checks credentials.
    async def login_with_persistent_state(request: Any) -> Any:
        await admin._load_database()
        return await admin.login(request)

    for route in app.router.routes:
        if route.path == "/admin/login":
            route.endpoint = login_with_persistent_state
    admin.jinax.add_global("cms_url", "/admin/cms")
    admin.jinax.add_global("config", admin.config)
    admin.register_widget(lambda: {"title": "Organization", "value": "Open source technology for developers"})
    return admin
