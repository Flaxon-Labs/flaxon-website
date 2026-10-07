# Email

Flaxon email uses a `Mailer` plus an adapter. Use `ConsoleAdapter` during development and `SMTPAdapter` when sending through a real mail server.

## Install

The mail package is included with Flaxon. No extra dependency is required for the console adapter. SMTP uses Python's standard `smtplib`.

## Development: print emails locally

This is a complete copy-paste example:

```python
from flaxon import Flaxon
from flaxon.mail import Email, Mailer
from flaxon.mail.adapters.console import ConsoleAdapter

app = Flaxon("mail-example", debug=True)
mailer = Mailer(ConsoleAdapter(print_body=True, print_html=True))

@app.post("/send-welcome")
async def send_welcome():
    await mailer.send(Email(
        from_address="noreply@example.com",
        to=["developer@example.com"],
        subject="Welcome to Flaxon",
        body="Your account is ready.",
        html_body="<h1>Welcome</h1><p>Your account is ready.</p>",
    ))
    return {"sent": True}
```

Run it with `flaxon run app:app --reload`. The message is printed to the terminal and is not delivered externally.

## Production: SMTP

Keep credentials in environment variables rather than source code:

```python
import os

from flaxon.mail import Email, Mailer
from flaxon.mail.adapters.smtp import SMTPAdapter

mailer = Mailer(SMTPAdapter(
    host=os.environ["MAIL_HOST"],
    port=int(os.getenv("MAIL_PORT", "587")),
    username=os.environ.get("MAIL_USERNAME"),
    password=os.environ.get("MAIL_PASSWORD"),
    use_tls=os.getenv("MAIL_USE_TLS", "true").lower() == "true",
    use_ssl=os.getenv("MAIL_USE_SSL", "false").lower() == "true",
))

async def send_invoice(recipient: str, invoice_number: str):
    await mailer.send(Email(
        from_address=os.environ["MAIL_FROM"],
        to=[recipient],
        subject=f"Invoice {invoice_number}",
        body=f"Your invoice number is {invoice_number}.",
    ))
```

Use `use_tls=True` for STARTTLS, normally on port `587`. Use `use_ssl=True` for implicit TLS, normally on port `465`; do not enable both for the same connection.

## Fluent message builder

`Mailer.create_message()` returns a chainable `Message` builder:

```python
message = (
    mailer.create_message()
    .from_address("billing@example.com", "Flaxon Billing")
    .to(("ada@example.com", "Ada Lovelace"))
    .cc("accounts@example.com")
    .reply_to("support@example.com")
    .subject("Your receipt")
    .body("Thanks for your payment.")
    .html("<p>Thanks for your payment.</p>")
    .header("X-Application", "flaxon")
    .attach("receipt.txt", b"Receipt contents")
    .build()
)
await mailer.send(message)
```

Attach a local file with `.attach("path/to/receipt.pdf")`, or provide bytes directly. `Attachment` infers the MIME type from the filename when one is not supplied.

## Templates

`EmailTemplate` uses a `TemplateEngine` backed by a Jinja environment:

```python
from jinja2 import Environment, FileSystemLoader, select_autoescape

from flaxon.mail import EmailTemplate, Mailer, TemplateEngine
from flaxon.mail.adapters.console import ConsoleAdapter

engine = Environment(
    loader=FileSystemLoader("email_templates"),
    autoescape=select_autoescape(["html", "xml"]),
)
template = EmailTemplate(
    engine=TemplateEngine(engine),
    subject_template="Welcome, {{ name }}",
    body_template="Hello {{ name }}, your plan is {{ plan }}.",
    html_template="<h1>Welcome, {{ name }}</h1><p>Plan: {{ plan }}</p>",
)

mailer = Mailer(ConsoleAdapter())
await mailer.send_template(
    template,
    {"name": "Ada", "plan": "Professional"},
    from_address="noreply@example.com",
    to=["ada@example.com"],
)
```

Use `await template.render_async(context, ...)` when the Jinja environment has async rendering enabled. Template values are escaped according to the Jinja environment; keep HTML templates under your application's control.

## Multiple recipients and headers

```python
from flaxon.mail import Email, EmailAddress

email = Email(
    from_address=EmailAddress("noreply@example.com", "Flaxon"),
    to=[EmailAddress("ada@example.com", "Ada")],
    cc=["team@example.com"],
    bcc=["audit@example.com"],
    reply_to="support@example.com",
    subject="Build complete",
    body="The build completed successfully.",
    headers={"X-Build-ID": "build-123"},
)
await mailer.send(email)
```

The SMTP adapter sends `to`, `cc`, and `bcc` recipients. Bcc addresses are used for delivery but are not included in the visible message headers.

## Bulk delivery

```python
emails = [
    Email(
        from_address="noreply@example.com",
        to=[address],
        subject="Monthly update",
        body="Here is your update.",
    )
    for address in ["ada@example.com", "grace@example.com"]
]
await mailer.send_many(emails)
```

`send_many` sends sequentially. For high-volume delivery, put mail work on a Flaxon task queue and use a provider with delivery retries, bounce handling, and suppression lists.

## Testing

Use `ConsoleAdapter` or a small fake adapter in tests so no network connection is opened:

```python
class FakeMailAdapter:
    def __init__(self):
        self.messages = []

    async def send(self, email):
        self.messages.append(email)

adapter = FakeMailAdapter()
mailer = Mailer(adapter)
await mailer.send(Email(
    from_address="test@example.com",
    to=["user@example.com"],
    subject="Test",
    body="Hello",
))
assert adapter.messages[0].subject == "Test"
```

## Operational checklist

- Set a verified `MAIL_FROM` address and configure SPF, DKIM, and DMARC for the sending domain.
- Keep SMTP credentials in environment variables or a secret manager.
- Use a task queue for slow or high-volume sends instead of blocking a request.
- Configure provider retries, bounce handling, unsubscribe rules, and rate limits.
- Avoid placing secrets or sensitive personal data in email subjects, headers, or logs.
