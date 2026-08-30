from __future__ import annotations

from urllib.parse import urlparse

from flaxon.database import DatabaseManager
from flaxon.database.adapters.postgresql import PostgreSQLAdapter
from flaxon.database.adapters.sqlite import SQLiteAdapter

from .config import Settings


def create_database(settings: Settings) -> DatabaseManager:
    """Use Neon PostgreSQL in production and SQLite for local development."""
    if settings.database_url:
        parsed = urlparse(settings.database_url)
        kwargs = {"ssl": "require"} if parsed.scheme.startswith("postgres") else {}
        adapter = PostgreSQLAdapter(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            database=(parsed.path or "/postgres").lstrip("/"),
            user=parsed.username or "postgres",
            password=parsed.password or "",
            **kwargs,
        )
    else:
        adapter = SQLiteAdapter(str(settings.data_dir / "flaxon-labs.sqlite3"))
    return DatabaseManager(adapter)
