from __future__ import annotations

from pathlib import Path

import pytest

from flaxon.database import DatabaseManager, MigrationRunner
from flaxon.database.adapters.sqlite import SQLiteAdapter


@pytest.mark.asyncio
async def test_website_migration_creates_persistent_schema(tmp_path: Path):
    database = DatabaseManager(SQLiteAdapter(str(tmp_path / "website.sqlite3")))
    await database.initialize()
    try:
        runner = MigrationRunner(database, str(Path(__file__).resolve().parents[1] / "migrations"))
        assert await runner.migrate() == ["0001"]
        for table in ("flaxon_admin_store", "flaxon_admin_operations", "flaxon_subscribers", "flaxon_contact_messages", "flaxon_community_rate_events"):
            assert await database.fetch_val("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $1", table) == 1
    finally:
        await database.close()
