"""Run migrations, bootstrap Admin, and back up SQLite safely."""

import argparse
import getpass
from pathlib import Path
import sqlite3
from modules.game import storage as database


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["migrate", "createsuperuser", "backup"])
    parser.add_argument("--destination", default="backups")
    args = parser.parse_args()
    if args.command == "migrate":
        database.migrate()
        print("Game schema ready. Admin initializes its own store on startup.")
    elif args.command == "createsuperuser":
        from flaxon.admin.services import AdminAuth, AdminStore

        store = AdminStore(str(database.DATA / "admin.sqlite3"))
        username = input("Username: ").strip()
        if username in store.list("users"):
            raise SystemExit("User already exists; use Admin to manage this account.")
        email = input("Email: ").strip()
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Confirm password: "):
            raise SystemExit("Passwords do not match.")
        auth = AdminAuth(strict_permissions=True)
        user = auth.add_user(
            {
                "username": username,
                "email": email,
                "password": password,
                "roles": ["administrator"],
                "email_verified": True,
            }
        )
        store.set("users", username, user)
        print("Admin created. Sign in at /admin/login. Enable MFA in your profile.")
    else:
        directory = Path(args.destination).resolve()
        directory.mkdir(parents=True, exist_ok=True)
        from datetime import datetime, timezone

        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        for name in ("games.sqlite3", "admin.sqlite3"):
            source = database.DATA / name
            if source.exists():
                with sqlite3.connect(source) as src, sqlite3.connect(
                    directory / f"{stamp}-{name}"
                ) as dst:
                    src.backup(dst)
        print(f"Backups saved in {directory}. Copy them to separate durable storage.")


if __name__ == "__main__":
    main()
