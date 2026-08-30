from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app


async def main() -> None:
    await app.database.initialize()
    try:
        database_ok = bool(await app.database.fetch_val("SELECT 1"))
        settings = app.settings
        checks = {
            "database": database_ok,
            "redis": bool(settings.redis_url),
            "blob": bool(settings.blob_token and settings.blob_public_url),
            "smtp": bool(settings.smtp_host and settings.smtp_from),
            "github": bool(settings.github_org),
        }
        print(json.dumps({"ok": database_ok and all(checks.values()), "checks": checks}, indent=2))
        if not database_ok or not all(checks.values()):
            raise SystemExit(1)
    finally:
        await app.database.close()


if __name__ == "__main__":
    asyncio.run(main())
