# Architecture

## Overview

Flaxon is an **ASGI-first Python web framework** that sits between clients and your application services.

The framework is responsible for:

- Protocol dispatch
- Routing
- Request and response handling
- Middleware execution
- Request validation
- Exception handling
- Application lifecycle events
- Extension and plugin registration

Business logic belongs in your application's services, models, and domain layer—not inside the framework.

---

# Layered Architecture

```text
┌──────────────────────────────────────────────────────┐
│                  Client Layer                         │
│  Web • Mobile • CLI • Desktop • Third-Party APIs     │
└──────────────────────────────┬───────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────┐
│                Flaxon Framework                      │
│  Protocol → Routing → Middleware → Endpoint          │
└──────────────────────────────┬───────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────┐
│               Application Layer                      │
│  Routes • Services • Schemas • Events • Business     │
└──────────────────────────────┬───────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────┐
│             Infrastructure Layer                     │
│ Database • Cache • Storage • Queue • Email • Redis   │
└──────────────────────────────────────────────────────┘
```

---

# ASGI Application

Flaxon fully implements the **ASGI 3.0 specification**.

Supported protocols include:

- **HTTP** — Request and response handling
- **WebSocket** — Real-time communication
- **Lifespan** — Startup and shutdown events

Example:

```python
async def __call__(self, scope, receive, send):
    if scope["type"] == "http":
        await self._handle_http(scope, receive, send)

    elif scope["type"] == "websocket":
        await self._handle_websocket(scope, receive, send)

    elif scope["type"] == "lifespan":
        await self._handle_lifespan(receive, send)
```

---

# Request Lifecycle

Every incoming request follows the same processing pipeline.

```text
        Client
           │
           ▼
    ASGI Server
           │
           ▼
      Flaxon App
           │
           ▼
      Middleware
           │
           ▼
        Router
           │
           ▼
 Parameter Resolution
           │
           ▼
 Validation (Schemas)
           │
           ▼
 Endpoint Function
           │
           ▼
 Response Conversion
           │
           ▼
 Exception Handling
           │
           ▼
      ASGI Response
```

Processing steps:

1. The ASGI server creates a request scope.
2. Flaxon receives the request.
3. Middleware executes.
4. The router matches the path and HTTP method.
5. Path parameters are converted.
6. Request data is validated.
7. The endpoint function executes.
8. Python objects are converted into HTTP responses.
9. Exceptions are translated into appropriate HTTP responses.
10. The ASGI server sends the response back to the client.

---

# Core Components

## Application

The `Flaxon` class is the heart of the framework.

It manages:

- Configuration
- Routes
- Middleware
- Application state
- Lifecycle events
- Jinax integration
- WebSocket rooms
- Debugger
- Extensions and plugins

---

## Router

The router is responsible for:

- Route registration
- URL matching
- URL generation
- HTTP method dispatch
- Path parameter conversion

Route templates use angle-bracket parameters:

```python
/users/<int:id>
```

---

## Request

The `Request` object provides convenient access to:

- HTTP method
- URL
- Path
- Headers
- Cookies
- Query parameters
- Path parameters
- Request body

Body methods are asynchronous for maximum performance.

---

## Response

Flaxon automatically converts common Python objects into HTTP responses.

Supported return values include:

- `dict`
- `list`
- `str`
- `bytes`
- `Response`
- Streaming responses

---

## Middleware

Middleware wraps the application and executes in order.

Typical middleware includes:

- CORS
- Security headers
- Authentication
- Rate limiting
- Request IDs
- Logging
- Compression

---

## Validation

Flaxon uses declarative schemas for request validation.

Validation automatically:

- Parses incoming data
- Converts types
- Validates values
- Returns HTTP 422 responses when validation fails
- Injects validated objects into route handlers

---

## WebSockets

Flaxon includes first-class WebSocket support.

Features include:

- Room management
- Broadcasting
- Connection lifecycle
- JSON messaging
- Custom managers

---

## Jinax

Jinax is Flaxon's optional server-side template engine.

It provides:

- HTML rendering
- Template inheritance
- Auto reload
- Jinja2 compatibility

---

# Dependency Direction

```text
Client
      │
      ▼
HTTP / WebSocket
      │
      ▼
Flaxon Framework
      │
      ▼
Application Services
      │
      ▼
Repositories
      │
      ▼
Infrastructure
```

Business services should avoid depending directly on `Request` objects whenever possible.

Keeping services framework-independent makes them reusable from:

- HTTP endpoints
- WebSocket handlers
- Scheduled jobs
- CLI commands
- Background workers
- Unit tests

---

# Concurrency Model

Flaxon is built on Python's **asyncio** event loop.

All request handling is asynchronous and optimized for high-concurrency I/O workloads.

## Best Practices

✔ Use asynchronous database drivers.

✔ Await all I/O operations.

✔ Prefer async HTTP clients.

✔ Keep endpoints non-blocking.

Avoid:

- Long CPU-intensive operations
- Blocking file operations
- Synchronous database drivers
- Blocking network requests

For CPU-intensive work, use background workers, task queues, or process pools to keep the event loop responsive.

---

# Architecture Principles

Flaxon is designed around a few core principles:

- **Async-first** — Built for modern asynchronous applications.
- **Technology-neutral** — Use any database, frontend, ORM, or client.
- **Minimal magic** — Explicit APIs that are easy to understand.
- **Scalable structure** — Start with a single file and grow into large applications.
- **Composable** — Add middleware, plugins, and extensions only when needed.
- **Developer-friendly** — Helpful debugging, validation, and tooling out of the box.
