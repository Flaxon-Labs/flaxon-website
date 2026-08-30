from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app


async def main() -> None:
    await app.database.initialize()
    try:
        cms = app.flaxon_labs_cms
        await cms._load_database()
        counts = {name: len(content.items) for name, content in cms.content_types.items()}
        print(f"CMS search source verified: {counts}")
    finally:
        await app.database.close()


if __name__ == "__main__":
    asyncio.run(main())
