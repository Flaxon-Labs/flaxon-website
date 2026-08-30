from __future__ import annotations

import pytest
from unittest.mock import patch

from flaxon_labs.services.email import SMTPMailer


class FakeSMTP:
    messages = []

    def __init__(self, host, port, timeout):
        self.host, self.port, self.timeout = host, port, timeout

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def starttls(self):
        self.tls_started = True

    def login(self, username, password):
        self.credentials = (username, password)

    def send_message(self, message):
        self.messages.append(message)


@pytest.mark.asyncio
async def test_smtp_mailer_builds_reset_link_without_logging_credentials():
    FakeSMTP.messages = []
    mailer = SMTPMailer("smtp.example.com", 587, "Flaxon Labs <no-reply@example.com>", "user", "secret", site_url="https://flaxonlabs.dev")
    with patch("flaxon_labs.services.email.smtplib.SMTP", FakeSMTP):
        await mailer("person@example.com", "token-123")
    message = FakeSMTP.messages[0]
    assert message["To"] == "person@example.com"
    assert "https://flaxonlabs.dev/admin/password-reset?token=token-123" in message.get_content()
    assert "secret" not in message.get_content()


@pytest.mark.asyncio
async def test_smtp_mailer_builds_verification_link():
    FakeSMTP.messages = []
    mailer = SMTPMailer("smtp.example.com", 587, "Flaxon Labs <no-reply@example.com>", site_url="https://flaxonlabs.dev", action_path="verify-email")
    with patch("flaxon_labs.services.email.smtplib.SMTP", FakeSMTP):
        await mailer("person@example.com", "verification-token")
    body = FakeSMTP.messages[0].get_content()
    assert "https://flaxonlabs.dev/admin/verify-email?token=verification-token" in body
    assert "/admin/password-reset" not in body
