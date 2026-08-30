from __future__ import annotations

import argparse
import os
import subprocess


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a PostgreSQL backup without exposing credentials.")
    parser.add_argument("destination", help="Output .dump path")
    args = parser.parse_args()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required.")
    subprocess.run(["pg_dump", "--format=custom", "--file", args.destination, database_url], check=True)
    print(f"Backup written to {args.destination}")


if __name__ == "__main__":
    main()
