from __future__ import annotations

import argparse
import asyncio
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app


async def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a Flaxon Labs Admin user.")
    parser.add_argument("username")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password")
    args = parser.parse_args()
    password = args.password or getpass.getpass("Admin password: ")
    if not password:
        raise SystemExit("A password is required.")
    admin = app.flaxon_labs_admin
    await app.database.initialize()
    await admin._load_database()
    record = admin.auth.add_user({"username": args.username, "email": args.email, "password": password, "roles": ["administrator"]})
    if admin.store:
        admin.store.set("users", record["username"], record)
    await admin._persist_database()
    await app.database.close()
    print(f"Admin user {args.username!r} is ready.")


if __name__ == "__main__":
    asyncio.run(main())
