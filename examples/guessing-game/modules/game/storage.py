"""SQLite persistence; each mutation is an atomic transaction."""

from contextlib import contextmanager
import hashlib
import os
from pathlib import Path
import secrets
import sqlite3
import time

DATA = Path(os.environ.get("DATA_DIR", "data")).resolve()
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / "games.sqlite3"


@contextmanager
def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def migrate():
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, secret INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0, outcome TEXT NOT NULL DEFAULT 'playing',
            created_at INTEGER NOT NULL, completed_at INTEGER)""")


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def public(row):
    return {
        key: row[key]
        for key in ("id", "attempts", "outcome", "created_at", "completed_at")
    }


def create():
    game_id, token = secrets.token_hex(16), secrets.token_urlsafe(32)
    with connect() as db:
        # Bound stale data growth. Finished results remain available in Admin.
        db.execute(
            "DELETE FROM games WHERE outcome='playing' AND created_at < ?",
            (int(time.time()) - 3600,),
        )
        db.execute(
            "INSERT INTO games (id,token_hash,secret,created_at) VALUES (?,?,?,?)",
            (game_id, token_hash(token), secrets.randbelow(100) + 1, int(time.time())),
        )
        row = db.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
    return {**public(row), "token": token}


def access(db, game_id, token):
    row = db.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
    if not row or not secrets.compare_digest(row["token_hash"], token_hash(token)):
        raise LookupError("Game not found or token invalid.")
    return row


def read(game_id, token):
    with connect() as db:
        return public(access(db, game_id, token))


def guess(game_id, token, value):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = access(db, game_id, token)
        if row["outcome"] != "playing":
            raise ValueError("This round is finished. Start a new game.")
        if row["created_at"] < int(time.time()) - 3600:
            raise ValueError("This round expired. Start a new game.")
        attempts = row["attempts"] + 1
        outcome = (
            "won" if value == row["secret"] else "lost" if attempts >= 10 else "playing"
        )
        completed = int(time.time()) if outcome != "playing" else None
        db.execute(
            "UPDATE games SET attempts=?,outcome=?,completed_at=? WHERE id=?",
            (attempts, outcome, completed, game_id),
        )
        result = public(
            db.execute("SELECT * FROM games WHERE id=?", (game_id,)).fetchone()
        )
        result["hint"] = (
            "correct"
            if value == row["secret"]
            else "higher" if value < row["secret"] else "lower"
        )
        if outcome != "playing":
            result["answer"] = row["secret"]
        return result
