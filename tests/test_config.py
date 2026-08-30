from __future__ import annotations

import pytest

from flaxon_labs.config import Settings


def test_development_configuration_keeps_local_defaults(monkeypatch, tmp_path):
    monkeypatch.setenv("FLAXON_LABS_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FLAXON_ENV", "development")
    settings = Settings.from_env()
    assert settings.debug is True


def test_production_rejects_development_credentials(monkeypatch, tmp_path):
    monkeypatch.setenv("FLAXON_LABS_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FLAXON_ENV", "production")
    monkeypatch.delenv("FLAXON_SECRET_KEY", raising=False)
    monkeypatch.delenv("FLAXON_ADMIN_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="Production configuration"):
        Settings.from_env()


def test_production_requires_shared_services(monkeypatch, tmp_path):
    monkeypatch.setenv("FLAXON_LABS_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FLAXON_ENV", "production")
    monkeypatch.setenv("FLAXON_SECRET_KEY", "x" * 48)
    monkeypatch.setenv("FLAXON_ADMIN_PASSWORD", "A-strong-production-password-123!")
    for name, value in {
        "DATABASE_URL": "postgresql://user:password@neon.example/db",
        "REDIS_URL": "rediss://redis.example/0",
        "BLOB_READ_WRITE_TOKEN": "vercel_blob_rw_test",
        "BLOB_PUBLIC_URL": "https://blob.example",
        "SMTP_HOST": "smtp.example",
        "SMTP_FROM": "Flaxon Labs <no-reply@example.com>",
    }.items():
        monkeypatch.setenv(name, value)
    settings = Settings.from_env()
    assert settings.debug is False
    assert settings.database_url.startswith("postgresql://")
    assert settings.redis_url.startswith("rediss://")


def test_production_reports_missing_shared_services(monkeypatch, tmp_path):
    monkeypatch.setenv("FLAXON_LABS_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FLAXON_ENV", "production")
    monkeypatch.setenv("FLAXON_SECRET_KEY", "x" * 48)
    monkeypatch.setenv("FLAXON_ADMIN_PASSWORD", "A-strong-production-password-123!")
    for name in ("DATABASE_URL", "REDIS_URL", "BLOB_READ_WRITE_TOKEN", "BLOB_PUBLIC_URL", "SMTP_HOST", "SMTP_FROM"):
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(RuntimeError) as error:
        Settings.from_env()
    message = str(error.value)
    assert "DATABASE_URL" in message
    assert "REDIS_URL" in message
    assert "BLOB_READ_WRITE_TOKEN" in message
    assert "SMTP_HOST" in message


def test_smtp_provider_aliases_are_supported(monkeypatch, tmp_path):
    monkeypatch.setenv("FLAXON_LABS_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("SMTP_ENABLED", "True")
    monkeypatch.setenv("SMTP_SERVER", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_USERNAME", "admin@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-password")
    monkeypatch.setenv("SMTP_USE_TLS", "True")
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_TLS", raising=False)
    settings = Settings.from_env()
    assert settings.smtp_host == "smtp.gmail.com"
    assert settings.smtp_from == "admin@example.com"
    assert settings.smtp_tls is True
