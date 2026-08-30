from __future__ import annotations

import argparse
import os
import subprocess


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore a PostgreSQL custom-format backup.")
    parser.add_argument("backup")
    parser.add_argument("--confirm", action="store_true", help="Confirm that the target database will be modified")
    args = parser.parse_args()
    if not args.confirm:
        raise SystemExit("Pass --confirm to restore a backup.")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required.")
    subprocess.run(["pg_restore", "--clean", "--if-exists", "--dbname", database_url, args.backup], check=True)


if __name__ == "__main__":
    main()
