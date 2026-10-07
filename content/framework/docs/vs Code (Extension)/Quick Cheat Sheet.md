# Flaxon VS Code Extension - Quick Cheat Sheet

> A 2-minute overview of everything the Flaxon VS Code Extension provides.

---

# 🚀 Main Features

✅ Route Explorer

View every route in your project from the sidebar.

---

✅ CodeLens

Run or debug routes directly above your functions.

```python
@app.get("/users")
# ▶ Run    🐛 Debug
async def get_users():
    ...
```

---

✅ IntelliSense

Smart auto-completion for:

- Routes
- Schemas
- Validation
- Exceptions
- Requests
- WebSockets

---

✅ Snippets

| Trigger | Creates |
|---------|---------|
| `froute` | GET Route |
| `fpost` | POST Route |
| `fws` | WebSocket |
| `fschema` | Schema |
| `fplugin` | Plugin |
| `ftest` | Test |

---

✅ Hover Documentation

Hover over Flaxon APIs to see documentation without leaving the editor.

---

✅ Diagnostics

Detects:

- Missing imports
- Invalid routes
- Non-async handlers
- Missing returns
- Schema issues
- WebSocket mistakes

---

✅ One-Click Run

Run your app directly from VS Code.

```
Flaxon: Run App
```

---

✅ Integrated Debugging

Supports:

- Breakpoints
- Variables
- Call Stack
- Exceptions

---

✅ Project Generator

Generate:

- Projects
- Routes
- Schemas
- Plugins

---

# ⌨️ Useful Commands

| Command | Purpose |
|---------|---------|
| Create Project | Generate a new Flaxon project |
| Run App | Start the application |
| Debug App | Launch debugger |
| Show Routes | Open Route Explorer |
| Generate Route | Create route |
| Generate Schema | Create schema |
| Generate Plugin | Create plugin |
| Restart Language Server | Restart IntelliSense |

---

# ⌨️ Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+Shift+R` | Route Explorer |
| `Ctrl+Shift+F5` | Run App |
| `Ctrl+Shift+U` | Output Panel |

---

# 📂 Project Detection

The extension automatically activates when it finds:

```
app.py
main.py
run.py
flaxon.py
```

---

# ⚙️ Recommended Settings

```json
{
    "flaxon.entryPoint": "app:app",
    "flaxon.enableRouteExplorer": true,
    "flaxon.enableCodeLens": true,
    "flaxon.enableDiagnostics": true,
    "flaxon.enableCompletions": true
}
```

---

# 💡 Typical Workflow

```
Create Project
      ↓
Write Routes
      ↓
Use Snippets
      ↓
Route Explorer
      ↓
Run App
      ↓
Debug
      ↓
Test
```

---

# 🛠 Common Fixes

| Problem | Solution |
|----------|----------|
| No routes | Save the file |
| No IntelliSense | Restart Language Server |
| No CodeLens | Enable CodeLens |
| Extension inactive | Open a Python file |
| Debug issues | Install Python extension |

---

# 📦 Best Experience

Recommended VS Code extensions:

- Python
- Pylance
- Error Lens
- GitHub Pull Requests

---

# 🎯 What You Get

- ⚡ Fast project scaffolding
- 🧠 Intelligent auto-completion
- 📍 Route Explorer
- ▶ One-click run
- 🐛 Integrated debugging
- 🔎 Hover documentation
- 📝 Code snippets
- 📊 Live diagnostics
- 🔌 Language Server support

---

**In short:** The Flaxon VS Code Extension brings an IDE-like development experience to Flaxon, making it easier to build, navigate, debug, and maintain Python web applications without leaving Visual Studio Code.