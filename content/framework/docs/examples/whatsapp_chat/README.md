# Flaxon WhatsApp-style Chat

This example is a small production-shaped real-time chat application built
with Flaxon WebSockets, Jinax, HTML, CSS, and browser JavaScript. It uses a
JSON event protocol similar to a Node.js Socket.IO-style service while keeping
the transport as native WebSockets.

## Run in editable mode

From the repository root:

```powershell
python -m pip install -e .
flaxon run docs.examples.whatsapp_chat.app:app --reload
```

Open `http://127.0.0.1:8000/?user=ada` in two browser tabs. Messages and typing
events are delivered to every connection in the `general` room.

## Protocol

The client sends `message.send`, `typing`, and `ping` JSON events. The server
sends `session.ready`, `message.created`, `presence.joined`, `presence.left`,
and `error` events. Message history is available at
`GET /api/rooms/general/messages`; liveness is available at `GET /health`.

## Production hardening

The example intentionally keeps storage in memory for easy local testing.
Replace `messages` with a database repository, validate the authenticated user
from a session or JWT, and add authorization for room membership. For multiple
workers, configure the framework's Redis broadcaster on
`app.websocket_manager` so room broadcasts cross process boundaries. Add a
message queue, attachment storage, moderation, rate limits, observability,
and a durable outbox before production deployment.
