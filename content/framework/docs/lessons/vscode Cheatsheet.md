# Flaxon VS Code Extension Cheat Sheet

A quick reference for the most commonly used features of the **Flaxon VS Code Extension**.

---

# 🚀 Commands

Open the **Command Palette** (`Ctrl+Shift+P`) and run:

| Command | Description |
|---------|-------------|
| **Flaxon: Create Project** | Create a new Flaxon project |
| **Flaxon: Run App** | Run the current Flaxon application |
| **Flaxon: Debug App** | Launch the debugger |
| **Flaxon: Generate Route** | Create a new route |
| **Flaxon: Generate Schema** | Generate a validation schema |
| **Flaxon: Generate Plugin** | Generate a plugin |
| **Flaxon: Show Routes** | Open the Route Explorer |
| **Flaxon: Restart Language Server** | Restart the language server |
| **Flaxon: Open Documentation** | Open the Flaxon documentation |

---

# ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Open Command Palette |
| `Ctrl+Shift+R` | Show Route Explorer |
| `Ctrl+Shift+F5` | Run Flaxon Application |
| `Ctrl+Shift+U` | Open Output Panel |
| `Ctrl+Shift+E` | Open Explorer |
| `Ctrl+S` | Save file (refreshes routes) |

---

# 📁 Route Explorer

Displays all discovered routes.

```
Flaxon Routes
├── app.py
│   ├── GET /
│   ├── POST /login
│   └── GET /users
├── api.py
│   ├── GET /api/posts
│   └── POST /api/posts
└── admin.py
    └── GET /admin
```

### Method Colors

| Method | Color |
|---------|-------|
| GET | 🟢 |
| POST | 🟠 |
| PUT | 🔵 |
| DELETE | 🔴 |
| PATCH | 🟣 |
| WebSocket | 🔷 |

---

# ⚡ CodeLens

Appears above route handlers.

```python
@app.get("/users")
# ▶ Run    🐛 Debug    📍 References
async def get_users():
    ...
```

Available actions:

- ▶ Run
- 🐛 Debug
- 📍 Find References

---

# 💡 IntelliSense

Type:

```python
@app.
```

Suggestions:

```
get
post
put
delete
patch
websocket
```

Other completions:

```python
fields.
```

```
String
Integer
Float
Boolean
Email
Choice
UUID
DateTime
```

---

# 📝 Snippets

| Trigger | Generates |
|----------|-----------|
| `froute` | GET Route |
| `fpost` | POST Route |
| `fws` | WebSocket Route |
| `fschema` | Schema |
| `fvalidation` | Validation Route |
| `fmiddleware` | Middleware |
| `fplugin` | Plugin |
| `ftest` | Test |

Example:

```
froute + Tab
```

↓

```python
@app.get("/api/users")
async def get_users(request):
    return {"users": []}
```

---

# 🔎 Hover Documentation

Hover over:

- `@app.get`
- `@app.post`
- `Schema`
- `fields.StrField`
- `HTTPException`

to view documentation.

---

# 🐛 Diagnostics

The extension checks for:

- Missing imports
- Missing `app = Flaxon()`
- Non-async route handlers
- Missing return values
- Missing WebSocket `accept()`
- Invalid schemas
- Invalid decorators

---

# ▶ Running Your App

Command Palette:

```
Flaxon: Run App
```

or

```
Ctrl+Shift+F5
```

---

# 🐞 Debugging

Run:

```
Flaxon: Debug App
```

Supports:

- Breakpoints
- Variable inspection
- Watch expressions
- Call stack
- Exceptions

---

# 🔧 Generate Code

Available generators:

- Project
- Route
- Schema
- Plugin

---

# ⚙️ Important Settings

```json
{
    "flaxon.entryPoint": "app:app",
    "flaxon.enableRouteExplorer": true,
    "flaxon.enableCodeLens": true,
    "flaxon.enableDiagnostics": true,
    "flaxon.enableCompletions": true,
    "flaxon.debug.reload": true,
    "flaxon.snippets.enable": true
}
```

---

# 📊 Status Bar

| Icon | Meaning |
|------|---------|
| ✅ Flaxon | Ready |
| 🔄 Flaxon | Language Server Starting |
| ❌ Flaxon | Error |

---

# 📂 Supported Project Files

The extension activates automatically when it detects:

```
app.py
main.py
run.py
flaxon.py
```

---

# 🚀 Development Workflow

```text
Create Project
      │
      ▼
Write Routes
      │
      ▼
Use Snippets
      │
      ▼
View Route Explorer
      │
      ▼
Run Application
      │
      ▼
Debug
      │
      ▼
Test
      │
      ▼
Commit
```

---

# 🛠 Troubleshooting

| Problem | Solution |
|----------|----------|
| Extension not activating | Open a Python file |
| No routes | Save file |
| No CodeLens | Enable `flaxon.enableCodeLens` |
| No completions | Enable `flaxon.enableCompletions` |
| LSP stopped | Run **Flaxon: Restart Language Server** |
| Debug not working | Install the Python extension |

---

# 📦 Recommended Extensions

| Extension | Purpose |
|------------|---------|
| Python | Python support |
| Pylance | IntelliSense |
| GitHub Pull Requests | Git integration |
| Error Lens | Better diagnostics |
| Better Comments | Comment highlighting |

---

# ✅ Best Practices

- Keep Route Explorer open.
- Use snippets whenever possible.
- Save files frequently.
- Enable diagnostics.
- Restart the Language Server if IntelliSense stops.
- Use CodeLens to run and debug routes quickly.

---

## Quick Reference

| Feature | Shortcut / Command |
|---------|--------------------|
| Command Palette | `Ctrl+Shift+P` |
| Route Explorer | `Ctrl+Shift+R` |
| Run App | `Ctrl+Shift+F5` |
| Output Panel | `Ctrl+Shift+U` |
| Restart Language Server | `Flaxon: Restart Language Server` |
| Create Project | `Flaxon: Create Project` |

---

Happy coding with **Flaxon**! 🚀