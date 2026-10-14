# Full-stack quick start

For generated projects, use the shared `settings.py`, `Flaxon.from_settings()`,
explicit mounts in `app.py`, and `management.py` workflow. See [ORM and project management](guides/orm.md)
for Python migrations, model registration, permission hooks, relationship editing,
and Admin/CMS metadata storage. Backend-only and legacy adapter examples remain supported.

## Updated starter workflow (next release)

The changes in [Flaxon PR #34](https://github.com/aldanedev-create/flaxon/pull/34) require a release containing that PR. They are not included in the published 0.3.0 package. Both the full-stack and basic starters generate `requirements.txt` instead of `pyproject.toml`.

After creating the project, use its interpreter directly; activation is optional:

```bash
cd my-project
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python management.py check
.venv/bin/python management.py runserver
```

On Windows PowerShell:

```powershell
Set-Location -LiteralPath my-project
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe management.py check
.\.venv\Scripts\python.exe management.py runserver
```

Run the migrations and administrator setup from the main walkthrough before using the database or Admin. The basic template uses `python -m flaxon run app:app --reload` instead of `management.py`.

### Slow or interrupted creation

Files appear before setup finishes. Wait for the completion message: Python still needs to create `.venv` and install its bundled pip. The updated CLI shows these as separate phases, with elapsed progress and a 120-second timeout per phase. Application dependencies download only when you run `pip install -r requirements.txt`. Disk speed and antivirus scanning may affect environment setup; the CLI cannot guarantee an instant finish.

If setup times out or you cancel it, keep your project files and retry from the parent directory:

```bash
python -m flaxon new my-project --resume-venv --venv-timeout 300
```

Recovery preserves edited sources, also supports older projects containing `pyproject.toml`, and prints the appropriate install command. Ctrl+C stops the setup process tree. For a new project using an environment you manage yourself:

```bash
flaxon new my-project --no-venv
```

The updated starter disables automatic background type checking; run `python management.py typecheck` explicitly when needed.


## Start from the published 0.3.0 project CLI

```bash
python -m pip install "flaxon[standard,admin]"
flaxon new project_manager
cd project_manager
# Activate the generated .venv, then:
python -m pip install -e .
python management.py check
python management.py makemigrations
python management.py migrate
python management.py setup-admin
python management.py runserver
```

For unreleased ORM features, install the repository revision or the pinned course
wheel rather than assuming those features are in the latest PyPI release.
Follow [getting started](getting-started.md) for activation commands and the
[complete project-manager ebook](fullstack/project-manager/index.md) to build a
real app, one complete file at a time.

## A minimal hand-written full-stack example

Build a Python API and a Teloce interface in the same project. Python 3.11+ is
required. Create a virtual environment and install compatible Flaxon/Teloce releases:

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install "flaxon[standard]"
```

For unreleased repository features, install your local Flaxon and teloce-py
checkouts with `pip install -e /path/to/teloce-py -e '/path/to/flaxon[standard]'`.

Create `app.py`:

```python
from pathlib import Path
from flaxon import Flaxon, Request

app = Flaxon("Taskboard", debug=True)
app.use_teloce(project_root=Path(__file__).parent, ui_dir="ui", title="Taskboard")

@app.get("/api/tasks")
async def tasks():
    return {"items": [{"id": 1, "title": "Try Flaxon"}]}

@app.get("/")
async def home(request: Request):
    return await request.compile("app.html")
```

Create `ui/app.html`:

```html
<template>
  <main>
    <h1>Taskboard</h1>
    <p role="status">{{ status }}</p>
    <ul>
      <li v-for="task in tasks" :key="task.id">{{ task.title }}</li>
    </ul>
  </main>
</template>
<script>
export default {
  data() {
    return { tasks: [], status: "Loading…" };
  },
  async mounted() {
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        throw new Error("Could not load tasks");
      }
      this.tasks = (await response.json()).items;
      this.status = "Ready";
    } catch {
      this.status = "Could not load tasks. Refresh to retry.";
    }
  }
};
</script>
<style scoped>main { max-width: 48rem; margin: auto; font-family: system-ui; }</style>
```

Run `flaxon run app:app --reload` and open http://127.0.0.1:8000.
The startup build turns the component into JavaScript. The returned HTML shell
mounts it, then the browser fetches the Python API. Changes trigger a server
restart; refresh the browser afterward. This is not browser HMR.

The fixture has no persistence or accounts. Continue with the
[10 full-stack lessons](fullstack/index.md) to add data, validation, modules,
authorization, testing and deployment. See the runnable
[TypeScript/CDN converter](../examples/teloce_head_ts/README.md) for `.vel` and `.ts`.
