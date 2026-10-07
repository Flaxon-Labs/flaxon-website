# Flaxon VS Code Extension - Advanced Guide

## Overview

This guide covers advanced usage, customization, performance tuning, debugging, and troubleshooting for the **Flaxon VS Code Extension**.

---

# 🧩 Extending the Extension

## Custom Snippets

You can create your own snippets by editing:

```text
snippets/flaxon.json
```

### Example

```json
{
  "Custom Route": {
    "prefix": ["croute"],
    "body": [
      "@app.${1:get}(\"${2:/api/${3:resource}}\")",
      "async def ${4:handler}(request):",
      "    \"\"\"${5:Custom handler}.\"\"\"",
      "    return {\"message\": \"${6:Custom response}\"}"
    ],
    "description": "Custom route template"
  }
}
```

---

## Custom Commands

Add custom commands to your extension's `package.json`.

### Example

```json
{
  "contributes": {
    "commands": [
      {
        "command": "flaxon.customCommand",
        "title": "Flaxon: Custom Command",
        "category": "Flaxon"
      }
    ]
  }
}
```

---

# 🔧 Language Server

## How It Works

The Flaxon Language Server (LSP) runs as a background Python process and provides intelligent editor features.

It performs the following tasks:

- Parses Python source files
- Builds an Abstract Syntax Tree (AST)
- Detects routes, schemas, and imports
- Provides auto-completion
- Generates diagnostics
- Displays hover documentation

---

## Language Server Lifecycle

```text
1. Extension activates
        │
        ▼
2. Language Server starts
        │
        ▼
3. Python file is opened
        │
        ▼
4. Routes and symbols are indexed
        │
        ▼
5. Completions and diagnostics become available
        │
        ▼
6. File changes trigger automatic updates
        │
        ▼
7. VS Code closes → Language Server exits
```

---

## Restarting the Language Server

Open the Command Palette and run:

```text
Flaxon: Restart Language Server
```

---

## Viewing Server Logs

1. Open the **Output** panel (`Ctrl+Shift+U`).
2. Select **Flaxon** from the dropdown.
3. Enable verbose logging:

```json
{
    "flaxon.trace.server": "verbose"
}
```

---

# 🎯 Customizing the Route Explorer

## Route Grouping

Routes can be grouped in different ways.

```json
{
    "flaxon.routeExplorer": {
        "groupBy": "file",
        "showMethods": true,
        "showLineNumbers": true
    }
}
```

### Available Grouping Options

| Option | Description |
|---------|-------------|
| `file` | Group routes by source file. |
| `prefix` | Group routes by URL prefix. |
| `tag` | Group routes by route tag. |

---

## Adding Route Metadata

Named routes improve organization and navigation.

```python
@app.get("/api/users", name="user.list")
async def get_users():
    return {"users": []}


@app.get("/api/users/<int:id>", name="user.detail")
async def get_user(id: int):
    return {"id": id}
```

---

# 🐛 Advanced Debugging

## Attach to a Running Process

Start your Flaxon application, then attach the debugger.

```json
{
    "name": "Python: Attach",
    "type": "python",
    "request": "attach",
    "connect": {
        "host": "localhost",
        "port": 5678
    }
}
```

---

## Debug with Environment Variables

```json
{
    "name": "Flaxon: Debug with Environment",
    "type": "python",
    "request": "launch",
    "module": "flaxon",
    "args": [
        "run",
        "app:app"
    ],
    "env": {
        "FLASK_ENV": "development",
        "DATABASE_URL": "postgresql://localhost/mydb"
    }
}
```

---

## Debug with Command-Line Arguments

```json
{
    "name": "Flaxon: Debug with Arguments",
    "type": "python",
    "request": "launch",
    "module": "flaxon",
    "args": [
        "run",
        "app:app",
        "--host",
        "0.0.0.0",
        "--port",
        "5000"
    ]
}
```

---

# 📊 Performance Optimization

## Large Projects

For larger projects, the following settings are recommended.

| Setting | Recommended Value |
|----------|------------------|
| `flaxon.enableRouteExplorer` | `true` |
| `flaxon.enableCodeLens` | `true` |
| `flaxon.enableDiagnostics` | `true` |
| `flaxon.enableCompletions` | `true` |
| `flaxon.trace.server` | `"off"` |

---

## Increase Language Server Memory

```json
{
    "flaxon.languageServer": {
        "memoryLimit": 1024
    }
}
```

---

## Exclude Large Directories

```json
{
    "files.watcherExclude": {
        "**/.venv/**": true,
        "**/node_modules/**": true,
        "**/__pycache__/**": true
    }
}
```

---

# 🔗 Integration with Other Extensions

## Python Extension

The Flaxon extension works best alongside:

| Extension | Purpose |
|-----------|---------|
| `ms-python.python` | Python language support |
| `ms-python.vscode-pylance` | Type checking and IntelliSense |

---

## Git Integration

Flaxon integrates with Git by:

- Refreshing the Route Explorer after changes
- Tracking modified route files
- Working seamlessly with Git diff views

---

## Testing Extensions

| Extension | Purpose |
|-----------|---------|
| `vscode.pytest` | Run Python tests |
| `hbenl.vscode-test-explorer` | View test results |

---

# 🛡️ Security

## Trusted Workspaces

The extension only activates in trusted workspaces.

```json
{
    "security.workspace.trust.enabled": true
}
```

---

## Privacy

The extension **does not**:

- Send your source code to external servers
- Track personal usage
- Store credentials

---

## Environment Variables

Configure environment variables for the integrated terminal.

```json
{
    "terminal.integrated.env.windows": {
        "FLAXON_ENV": "production"
    }
}
```

---

# 🔄 CI/CD Integration

## CLI Commands

The extension uses the Flaxon CLI internally.

```bash
# Validate project
flaxon doctor app:app

# List routes
flaxon routes app:app

# Run tests
pytest
```

---

## GitHub Actions

```yaml
- name: Check Flaxon Project
  run: |
    pip install flaxon
    flaxon doctor app:app
    flaxon routes app:app
```

---

# 📚 Daily Workflow

## Typical Development Workflow

1. Open your project.
2. Route Explorer loads automatically.
3. Create a new route using snippets.
4. View discovered routes.
5. Run or debug your application.
6. Test your code.
7. Commit your changes.

---

## Advanced Workflow

- Multiple workspace folders
- Shared snippets
- Shared workspace settings
- Route Explorer during code reviews
- Automatic API documentation support

---

# 🎯 Productivity Tips

| Tip | Description |
|------|-------------|
| `Ctrl+Shift+R` | Quickly open Route Explorer |
| `Ctrl+Shift+F5` | Run the application |
| Snippets | Use `froute`, `fschema`, and `fws` |
| CodeLens | Run and debug directly from routes |
| Route Explorer | Click routes to navigate instantly |

---

## Advanced Tips

| Tip | Description |
|------|-------------|
| Custom Snippets | Create project-specific templates |
| Workspace Settings | Customize behavior per project |
| Multi-root Workspaces | Work with multiple Flaxon projects |
| Remote Development | Compatible with VS Code Remote |

---

# 🐛 Common Issues

## Language Server Crashes

### Symptoms

- Auto-completion stops working
- Diagnostics disappear
- Hover documentation is unavailable

### Solutions

- Restart the Language Server.
- Verify Python and Flaxon are installed.
- Increase the Language Server memory limit.

---

## Route Explorer Not Updating

### Symptoms

Routes do not appear or refresh.

### Solutions

- Save the file.
- Refresh the Route Explorer.
- Restart VS Code.

---

## CodeLens Missing

### Symptoms

Run and Debug buttons are not visible.

### Solutions

- Enable `flaxon.enableCodeLens`.
- Save the file.
- Restart the Language Server.

---

## Auto-Completion Missing

### Symptoms

No suggestions appear while typing.

### Solutions

- Enable `flaxon.enableCompletions`.
- Ensure the Python Language Server is running.
- Restart VS Code.

---

# 📊 Telemetry

## Data Collection

| Data | Collected |
|------|-----------|
| Commands Used | ✅ |
| Errors | ✅ |
| Performance Metrics | ✅ |
| Source Code | ❌ |
| File Contents | ❌ |

---

## Disable Telemetry

```json
{
    "flaxon.telemetry.enabled": false
}
```

---

# 🔄 Version History

## Version 0.1.2

Initial release including:

- Route Explorer
- CodeLens
- Auto-completion
- Hover Documentation
- Diagnostics
- Code Snippets
- Commands
- Language Server

---

## Planned Features

| Feature | Target Version |
|---------|----------------|
| GraphQL Schema Explorer | 0.2.0 |
| Admin Dashboard Preview | 0.3.0 |
| Plugin Development Tools | 0.4.0 |
| Performance Profiling | 0.5.0 |

---

# 📚 Resources

## Official Resources

- 📚 Documentation
- 🌐 Website
- 🐙 GitHub
- 📦 Visual Studio Marketplace

---

## Community

- 💬 Discussions
- 🐛 Issue Tracker

---

The **Flaxon VS Code Extension** is designed to make Flaxon development faster, smarter, and more enjoyable. Happy coding! 🚀