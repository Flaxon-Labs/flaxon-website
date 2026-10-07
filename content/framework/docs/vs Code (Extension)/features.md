# Flaxon VS Code Extension - Features Guide

## Overview

The **Flaxon VS Code Extension** provides a comprehensive set of features to supercharge your Flaxon development workflow.

---

# 🔍 Route Explorer

## What It Does

The **Route Explorer** displays all your Flaxon routes in a hierarchical tree view inside the VS Code Explorer sidebar, making it easy to navigate large projects.

## How to Access

1. Open the **Explorer** sidebar (`Ctrl+Shift+E`).
2. Expand the **Flaxon Routes** section.

## Features

| Feature | Description |
|---------|-------------|
| **Route Tree** | Displays all routes grouped by file. |
| **Method Icons** | Color-coded HTTP methods (GET, POST, PUT, DELETE, PATCH, WS). |
| **Click Navigation** | Click any route to jump directly to its definition. |
| **Auto Refresh** | Updates automatically whenever files change. |
| **Search** | Filter routes by typing in the search box. |

## Example Route Tree

```text
Flaxon Routes
├── 📄 app.py
│   ├── GET  /                  (line 12)
│   ├── GET  /api/users         (line 22)
│   ├── POST /api/users         (line 30)
│   └── WS   /ws/chat           (line 45)
├── 📄 auth.py
│   ├── POST /api/auth/login    (line 8)
│   └── POST /api/auth/logout   (line 16)
└── 📄 admin.py
    └── GET  /admin             (line 10)
```

## HTTP Method Colors

| Method | Color | Icon |
|--------|-------|------|
| GET | 🟢 Green | `→` |
| POST | 🟠 Orange | `+` |
| PUT | 🔵 Blue | `✎` |
| DELETE | 🔴 Red | `✕` |
| PATCH | 🟣 Purple | `✎` |
| WebSocket | 🔷 Cyan | `↔` |

---

# ⚡ CodeLens

## What It Does

**CodeLens** adds useful actions directly above your route handlers, allowing you to run, debug, or locate references without leaving the editor.

## Features

| Button | Action |
|--------|--------|
| **▶ Run** | Execute the selected route handler. |
| **🐛 Debug** | Start debugging the selected route. |
| **📍 References** | View all references to the route. |

## Example

```python
@app.get("/users/<int:user_id>")
# ▶ Run    🐛 Debug    📍 3 References
async def get_user(user_id: int):
    return {
        "id": user_id,
        "name": f"User {user_id}"
    }
```

### Visual Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ @app.get("/users/<int:user_id>")                           │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ▶ Run │ 🐛 Debug │ 📍 3 References                  │  │
│ └───────────────────────────────────────────────────────┘  │
│ async def get_user(user_id: int):                         │
│     return {"id": user_id, "name": f"User {user_id}"}     │
└─────────────────────────────────────────────────────────────┘
```

---

# 💡 Intelligent Completions

## What It Does

The extension provides intelligent auto-completion for Flaxon APIs, decorators, validation classes, exceptions, and request objects as you type.

## Completion Categories

| Context | Suggestions |
|---------|-------------|
| `@app.` | `get`, `post`, `put`, `delete`, `patch`, `websocket` |
| `fields.` | `String`, `Integer`, `Float`, `Boolean`, `Email`, `Choice`, `UUID`, `DateTime` |
| `HTTPException(` | `400`, `401`, `403`, `404`, `422`, `500` |
| `request.` | `json()`, `form()`, `body()`, `headers`, `query_params`, `path_params`, `cookies` |
| `Schema` | Schema class templates and completions |

## Example

Type:

```python
@app.
```

Suggestions:

```text
@app.get         - GET route decorator
@app.post        - POST route decorator
@app.put         - PUT route decorator
@app.delete      - DELETE route decorator
@app.patch       - PATCH route decorator
@app.websocket   - WebSocket route decorator
```

---

# 📝 Code Snippets

## What They Do

Speed up development with built-in snippets for common Flaxon patterns.

## Available Snippets

| Trigger | Description |
|---------|-------------|
| `froute` | Complete GET route |
| `fpost` | POST route |
| `fws` | WebSocket endpoint |
| `fschema` | Schema class |
| `fvalidation` | Route with validation |
| `fmiddleware` | Middleware boilerplate |
| `fplugin` | Plugin template |
| `ftest` | Test case |

## Example

Typing:

```text
froute
```

Then pressing **Tab** generates:

```python
@app.get("/api/users")
async def get_users(request):
    """Get all users."""
    return {
        "users": []
    }
```

---

# 🔎 Hover Documentation

## What It Does

Hover over Flaxon APIs to view inline documentation, examples, and parameter descriptions.

## Supported APIs

| API | Documentation |
|-----|---------------|
| `@app.get` | Route usage and parameters |
| `@app.post` | Route usage and parameters |
| `@app.websocket` | WebSocket route documentation |
| `fields.StrField` | Field options and examples |
| `fields.IntField` | Integer field documentation |
| `HTTPException` | Status codes and usage |
| `Schema` | Schema documentation |

## Example

```python
@app.get("/users")
async def get_users():
    return {"users": []}
```

Hovering over `@app.get` displays:

```python
Flaxon GET Route

@app.get("/path")
async def handler(request):
    return {"message": "Hello"}
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `path` | Route path (for example, `/users/<int:id>`) |
| `name` | Optional route name |

---
# 🏃 One-Click Run

## What It Does

Run your Flaxon application with a single command directly from Visual Studio Code.

---

## How to Use

1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Run:

```text
Flaxon: Run App
```

3. Your application starts automatically in the integrated terminal.

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto Reload** | Reloads automatically when source files change. |
| **Integrated Terminal** | Displays application output inside VS Code. |
| **Port Detection** | Uses the configured port (default: `8000`). |
| **Entry Point Detection** | Automatically detects `app:app` or prompts for an entry point. |

---

## Configuration

```json
{
    "flaxon.entryPoint": "app:app",
    "flaxon.debug.reload": true
}
```

---

# 🐛 Integrated Debugging

## What It Does

Debug Flaxon applications using the built-in Visual Studio Code debugger.

---

## How to Use

1. Open the **Command Palette**.
2. Run:

```text
Flaxon: Debug App
```

3. The debugger launches with your application.

---

## Debugging Features

| Feature | Description |
|---------|-------------|
| **Breakpoints** | Pause execution anywhere in your code. |
| **Variable Inspection** | Inspect variables in real time. |
| **Call Stack** | View the current execution stack. |
| **Watch Expressions** | Monitor custom expressions while debugging. |
| **Exception Handling** | Automatically stop when exceptions occur. |

---

## Debug Configuration

```json
{
    "name": "Flaxon: Debug App",
    "type": "python",
    "request": "launch",
    "module": "flaxon",
    "args": [
        "run",
        "app:app"
    ],
    "console": "integratedTerminal"
}
```

---

# 🔧 Project Scaffolding

## What It Does

Generate complete Flaxon projects and common project components with a few clicks.

---

## Available Commands

| Command | Description |
|---------|-------------|
| **Flaxon: Create Project** | Create a new Flaxon project. |
| **Flaxon: Generate Route** | Generate a new route module. |
| **Flaxon: Generate Schema** | Generate a validation schema. |
| **Flaxon: Generate Plugin** | Generate a new plugin template. |

---

## Create Project Workflow

1. Enter the project name.
2. Choose the project location.
3. The extension generates a starter project containing:

```text
project/
├── app.py
├── pyproject.toml
├── README.md
├── requirements.txt
└── .gitignore
```

---

## Generate Route Workflow

1. Enter the route path.

Example:

```text
/api/users
```

2. Select the HTTP method.

- GET
- POST
- PUT
- DELETE
- PATCH
- WebSocket

3. (Optional) Enter a route name.

The extension generates a route file with boilerplate code.

---

## Generate Schema Workflow

1. Enter a schema name.

Example:

```text
CreateUser
```

2. Add your fields.

For each field you can specify:

- Name
- Type
- Required status
- Default value
- Constraints (minimum, maximum, length, choices, etc.)

The extension generates the complete schema class automatically.

---

# 📊 Real-time Diagnostics

## What It Does

Detects common Flaxon mistakes as you type and displays warnings or errors directly in the editor.

---

## Diagnostics

| Diagnostic | Description |
|------------|-------------|
| **Missing Import** | `from flaxon import Flaxon` not found. |
| **Missing Application** | `app = Flaxon()` not defined. |
| **Async Handler** | Route handlers should be asynchronous. |
| **Missing Return** | Route handlers should return a response. |
| **WebSocket Accept** | Missing `await socket.accept()`. |
| **Validation Imports** | Missing validation imports. |
| **Exception Imports** | Missing `HTTPException` import. |

---

## Example

```python
@app.get("/users")
def get_users():
    return {"users": []}
```

Diagnostics:

```text
⚠ Route handler should be async.
⚠ Missing return type annotation.
```

---

# 🎨 Syntax Highlighting

## What It Does

Provides syntax highlighting specifically designed for Flaxon applications.

---

## Highlighted Elements

| Element | Highlight |
|---------|-----------|
| Route Decorators | `@app.get`, `@app.post` |
| Path Parameters | `<int:user_id>` |
| Schema Fields | `fields.StrField` |
| HTTP Exceptions | `HTTPException` |
| WebSockets | `@app.websocket` |
| Validation | `Schema`, `required=True` |

---

# 📋 Command Reference

## Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| **Flaxon: Create Project** | Create a new project | — |
| **Flaxon: Run App** | Run the application | `Ctrl+Shift+F5` |
| **Flaxon: Debug App** | Start debugging | — |
| **Flaxon: Generate Route** | Generate a route | — |
| **Flaxon: Generate Schema** | Generate a schema | — |
| **Flaxon: Generate Plugin** | Generate a plugin | — |
| **Flaxon: Show Routes** | Open Route Explorer | `Ctrl+Shift+R` |
| **Flaxon: Open Documentation** | Open documentation | — |
| **Flaxon: Restart Language Server** | Restart the language server | — |

---

# ⚙️ Configuration Settings

## Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `flaxon.pythonPath` | `python3` | Python interpreter path |
| `flaxon.entryPoint` | `app:app` | Application entry point |
| `flaxon.enableRouteExplorer` | `true` | Enable Route Explorer |
| `flaxon.enableCodeLens` | `true` | Enable CodeLens |
| `flaxon.enableDiagnostics` | `true` | Enable diagnostics |
| `flaxon.enableCompletions` | `true` | Enable IntelliSense |
| `flaxon.trace.server` | `off` | Language Server trace level |
| `flaxon.debug.reload` | `true` | Auto reload application |
| `flaxon.snippets.enable` | `true` | Enable snippets |

---

## Example Configuration

```json
{
    "flaxon.pythonPath": "python3.11",
    "flaxon.entryPoint": "main:app",
    "flaxon.enableRouteExplorer": true,
    "flaxon.enableCodeLens": true,
    "flaxon.enableDiagnostics": true,
    "flaxon.enableCompletions": true,
    "flaxon.trace.server": "verbose",
    "flaxon.debug.reload": true,
    "flaxon.snippets.enable": true
}
```

---

# 🎯 Best Practices

## Recommended Workflow

1. Create a project.
2. Define your routes.
3. Use snippets and IntelliSense.
4. View routes in the Route Explorer.
5. Run the application.
6. Debug when needed.
7. Generate additional components using the scaffolding commands.

---

## Tips

- ✅ Keep the **Route Explorer** open while developing.
- ✅ Use snippets to reduce repetitive code.
- ✅ Enable diagnostics for instant feedback.
- ✅ Use the debugger to investigate complex issues.
- ✅ Save files frequently to refresh routes automatically.

---

# 🐛 Troubleshooting

## Common Issues

| Issue | Solution |
|-------|----------|
| Extension not activating | Open a Python file containing Flaxon code. |
| Route Explorer empty | Save the file and ensure routes use `@app.*` decorators. |
| CodeLens missing | Enable `flaxon.enableCodeLens`. |
| Auto-completion missing | Enable `flaxon.enableCompletions`. |
| Language Server not starting | Verify Python and Flaxon are installed. |
| Debugging unavailable | Install the Python extension and debugger. |

---

## Checking Logs

1. Open the **Output** panel (`Ctrl+Shift+U`).
2. Select **Flaxon** from the dropdown.
3. Review any logged errors or warnings.

---

## Reporting Issues

When opening an issue, include:

- VS Code version
- Operating system
- Python version
- Flaxon version
- Extension version
- Steps to reproduce the issue
- Output panel logs
- Screenshots (if applicable)

---

Happy coding with **Flaxon**! 🚀