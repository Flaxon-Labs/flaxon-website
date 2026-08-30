from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class CommunityStore:
    """Persistent contact and newsletter operations for the public website."""

    def __init__(self, database: Any) -> None:
        self.database = database

    async def initialize(self) -> None:
        await self.database.execute("CREATE TABLE IF NOT EXISTS flaxon_subscribers (id VARCHAR(64) PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, created_at VARCHAR(64) NOT NULL)")
        await self.database.execute("CREATE TABLE IF NOT EXISTS flaxon_contact_messages (id VARCHAR(64) PRIMARY KEY, name VARCHAR(160) NOT NULL, email VARCHAR(320) NOT NULL, subject VARCHAR(240) NOT NULL, message TEXT NOT NULL, status VARCHAR(32) NOT NULL, created_at VARCHAR(64) NOT NULL, ip_address VARCHAR(64), user_agent TEXT)")
        await self.database.execute("CREATE TABLE IF NOT EXISTS flaxon_community_rate_events (id VARCHAR(64) PRIMARY KEY, action VARCHAR(32) NOT NULL, ip_address VARCHAR(64) NOT NULL, created_at VARCHAR(64) NOT NULL)")
        for statement in (
            "ALTER TABLE flaxon_contact_messages ADD COLUMN ip_address VARCHAR(64)",
            "ALTER TABLE flaxon_contact_messages ADD COLUMN user_agent TEXT",
        ):
            try:
                await self.database.execute(statement)
            except Exception:
                pass

    @staticmethod
    def _email(value: Any) -> str:
        email = str(value or "").strip().lower()
        if len(email) > 320 or not EMAIL_RE.match(email):
            raise ValueError("Enter a valid email address.")
        return email

    async def subscribe(self, email: Any, ip_address: str = "") -> dict[str, Any]:
        await self._check_rate_limit("subscribe", ip_address)
        normalized = self._email(email)
        row = await self.database.fetch_one("SELECT id, email, created_at FROM flaxon_subscribers WHERE email = $1", normalized)
        if row:
            return {"id": row["id"], "email": row["email"], "created_at": row["created_at"], "existing": True}
        record = {"id": uuid.uuid4().hex, "email": normalized, "created_at": datetime.now(timezone.utc).isoformat()}
        await self.database.execute("INSERT INTO flaxon_subscribers(id, email, created_at) VALUES ($1, $2, $3)", record["id"], record["email"], record["created_at"])
        return record | {"existing": False}

    async def contact(self, data: dict[str, Any]) -> dict[str, Any]:
        await self._check_rate_limit("contact", str(data.get("ip_address") or ""))
        name, subject, message = str(data.get("name", "")).strip(), str(data.get("subject", "")).strip(), str(data.get("message", "")).strip()
        email = self._email(data.get("email"))
        if not name or len(name) > 160:
            raise ValueError("Enter your name.")
        if not subject or len(subject) > 240:
            raise ValueError("Enter a subject.")
        if not message or len(message) > 20_000:
            raise ValueError("Enter a message under 20,000 characters.")
        record = {"id": uuid.uuid4().hex, "name": name, "email": email, "subject": subject, "message": message, "status": "new", "created_at": datetime.now(timezone.utc).isoformat(), "ip_address": str(data.get("ip_address") or "")[:64], "user_agent": str(data.get("user_agent") or "")[:1000]}
        await self.database.execute("INSERT INTO flaxon_contact_messages(id, name, email, subject, message, status, created_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", record["id"], record["name"], record["email"], record["subject"], record["message"], record["status"], record["created_at"], record["ip_address"], record["user_agent"])
        return record

    async def _check_rate_limit(self, action: str, ip_address: str) -> None:
        """Apply a shared database window when a trustworthy client IP exists."""
        ip_address = ip_address.strip()[:64]
        if not ip_address:
            return
        cutoff = datetime.now(timezone.utc).timestamp() - 60
        events = await self.database.fetch_all("SELECT created_at FROM flaxon_community_rate_events WHERE action = $1 AND ip_address = $2", action, ip_address)
        recent = 0
        for event in events:
            try:
                if datetime.fromisoformat(str(event["created_at"])).timestamp() >= cutoff:
                    recent += 1
            except (KeyError, TypeError, ValueError):
                continue
        if recent >= 5:
            raise ValueError("Too many submissions. Please wait a minute and try again.")
        now = datetime.now(timezone.utc).isoformat()
        await self.database.execute("INSERT INTO flaxon_community_rate_events(id, action, ip_address, created_at) VALUES ($1, $2, $3, $4)", uuid.uuid4().hex, action, ip_address, now)

    async def list_messages(self, limit: int = 50) -> list[dict[str, Any]]:
        limit = max(1, min(int(limit), 200))
        return await self.database.fetch_all(f"SELECT id, name, email, subject, message, status, created_at, ip_address, user_agent FROM flaxon_contact_messages ORDER BY created_at DESC LIMIT {limit}")

    async def list_subscribers(self, limit: int = 100) -> list[dict[str, Any]]:
        limit = max(1, min(int(limit), 500))
        return await self.database.fetch_all(f"SELECT id, email, created_at FROM flaxon_subscribers ORDER BY created_at DESC LIMIT {limit}")

    async def update_message_status(self, message_id: str, status: str) -> bool:
        if status not in {"new", "in_progress", "resolved", "spam"}:
            raise ValueError("Unsupported message status.")
        await self.database.execute("UPDATE flaxon_contact_messages SET status = $1 WHERE id = $2", status, message_id)
        return bool(await self.database.fetch_one("SELECT id FROM flaxon_contact_messages WHERE id = $1", message_id))

    async def counts(self) -> dict[str, int]:
        return {"subscribers": int(await self.database.fetch_val("SELECT COUNT(*) FROM flaxon_subscribers") or 0), "messages": int(await self.database.fetch_val("SELECT COUNT(*) FROM flaxon_contact_messages") or 0)}
