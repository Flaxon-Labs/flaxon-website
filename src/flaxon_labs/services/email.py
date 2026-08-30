"""SMTP delivery callback used by Flaxon Admin authentication workflows."""

from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage
from typing import Any


class SMTPMailer:
    def __init__(self, host: str, port: int, sender: str, username: str | None = None, password: str | None = None, tls: bool = True, site_url: str = "", action_path: str = "password-reset") -> None:
        self.host, self.port, self.sender = host, int(port), sender
        self.username, self.password, self.tls, self.site_url = username, password, tls, site_url.rstrip("/")
        self.action_path = action_path.strip("/") or "password-reset"

    async def __call__(self, recipient: str, token: str) -> None:
        await asyncio.to_thread(self._send, recipient, token)

    def _send(self, recipient: str, token: str) -> None:
        message = EmailMessage()
        message["From"], message["To"] = self.sender, recipient
        message["Subject"] = "Flaxon Labs account action"
        message.set_content(f"Use this one-time link within one hour: {self.site_url}/admin/{self.action_path}?token={token}\n\nIf you did not request this, ignore this message.")
        with smtplib.SMTP(self.host, self.port, timeout=15) as client:
            if self.tls:
                client.starttls()
            if self.username:
                client.login(self.username, self.password or "")
            client.send_message(message)
