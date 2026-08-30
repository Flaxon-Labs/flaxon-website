from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass


ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    root_dir: Path
    template_dir: Path
    static_dir: Path
    data_dir: Path
    admin_storage_path: Path
    database_url: str | None
    redis_url: str | None
    blob_token: str | None
    blob_public_url: str | None
    secret_key: str
    debug: bool
    site_url: str
    github_org: str
    github_token: str | None
    smtp_host: str | None
    smtp_port: int
    smtp_username: str | None
    smtp_password: str | None
    smtp_from: str | None
    smtp_tls: bool

    @classmethod
    def from_env(cls) -> "Settings":
        environment = os.getenv("FLAXON_ENV", "development").lower()
        secret_key = os.getenv("FLAXON_SECRET_KEY", "dev-only-change-this-secret")
        admin_password = os.getenv("FLAXON_ADMIN_PASSWORD", "ChangeThis123!")
        smtp_enabled = os.getenv("SMTP_ENABLED", "true").lower() not in {"0", "false", "no"}
        smtp_host = os.getenv("SMTP_HOST") or os.getenv("SMTP_SERVER") or None
        smtp_username = os.getenv("SMTP_USERNAME") or None
        smtp_password = os.getenv("SMTP_PASSWORD") or None
        smtp_from = os.getenv("SMTP_FROM") or smtp_username
        smtp_tls = os.getenv("SMTP_TLS", os.getenv("SMTP_USE_TLS", "true")).lower() not in {"0", "false", "no"}
        if not smtp_enabled:
            smtp_host = smtp_username = smtp_password = smtp_from = None
        if environment == "production":
            missing = []
            if not secret_key or secret_key == "dev-only-change-this-secret" or len(secret_key) < 32:
                missing.append("FLAXON_SECRET_KEY (at least 32 characters)")
            if not admin_password or admin_password == "ChangeThis123!":
                missing.append("FLAXON_ADMIN_PASSWORD")
            required_integrations = {
                "DATABASE_URL": os.getenv("DATABASE_URL"),
                "REDIS_URL": os.getenv("REDIS_URL"),
                "BLOB_READ_WRITE_TOKEN": os.getenv("BLOB_READ_WRITE_TOKEN"),
                "BLOB_PUBLIC_URL": os.getenv("BLOB_PUBLIC_URL"),
                "SMTP_HOST": smtp_host,
                "SMTP_FROM": smtp_from,
            }
            missing.extend(name for name, value in required_integrations.items() if not value)
            if missing:
                raise RuntimeError("Production configuration is unsafe or incomplete: " + ", ".join(missing))
        # Vercel's deployed bundle is read-only; only the explicit /tmp area is writable.
        default_data_dir = "/tmp/flaxon-labs" if os.getenv("VERCEL") else str(ROOT / "var")
        data_dir = Path(os.getenv("FLAXON_LABS_DATA_DIR", default_data_dir))
        data_dir.mkdir(parents=True, exist_ok=True)
        admin_storage_path = Path(os.getenv("FLAXON_ADMIN_STORAGE_PATH", str(data_dir / "admin.sqlite3")))
        admin_storage_path.parent.mkdir(parents=True, exist_ok=True)
        return cls(
            root_dir=ROOT,
            template_dir=ROOT / "src" / "flaxon_labs" / "templates",
            static_dir=ROOT / "static",
            data_dir=data_dir,
            admin_storage_path=admin_storage_path,
            database_url=os.getenv("DATABASE_URL") or None,
            redis_url=os.getenv("REDIS_URL") or None,
            blob_token=os.getenv("BLOB_READ_WRITE_TOKEN") or None,
            blob_public_url=os.getenv("BLOB_PUBLIC_URL") or None,
            secret_key=secret_key,
            debug=environment != "production",
            site_url=os.getenv("SITE_URL", "http://127.0.0.1:8000").rstrip("/"),
            github_org=os.getenv("GITHUB_ORG", "Flaxon-Labs"),
            github_token=os.getenv("GITHUB_TOKEN") or None,
            smtp_host=smtp_host,
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_username=smtp_username,
            smtp_password=smtp_password,
            smtp_from=smtp_from,
            smtp_tls=smtp_tls,
        )
