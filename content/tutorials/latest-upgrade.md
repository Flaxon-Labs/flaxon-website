# Upgrade to the latest Flaxon workflow

Use **Flaxon 0.3.0** with **Teloce-Py 0.3.0**, both published on PyPI. The version is 0.3.0, not 3.0.0. Review the [changelog](../changelog.html) and test your application's JSON and authentication consumers before upgrading.

## Install the published packages

```bash
python -m pip install --upgrade "flaxon[standard,admin]==0.3.0" "teloce-py==0.3.0"
python -m pip check
```

Use a virtual environment and commit your project's dependency pins. Backend-only and Jinax applications remain supported.

## Start with the generated project

```bash
flaxon new project_manager
cd project_manager
python management.py check
python management.py makemigrations
python management.py migrate
python management.py setup-admin
python management.py runserver
```

`app.py` creates the application and mounts feature modules. `settings.py` owns
configuration, `models.py` defines Tortoise-backed models, and `management.py`
runs Flaxon's commands. Migrations are explicit Python files. Starting the server
does not silently update tables. See the [project setup guide](../getting-started/project-setup.html).

You can build a Teloce full-stack app, a Jinax server-rendered app, or use
Flaxon as a [backend-only API](backend-only.html). Existing lessons for those
choices remain available.

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

## Review JSON consumers

The modern response path uses `orjson`. Decimal values and integers beyond
JavaScript's safe range become strings. Aware datetimes use UTC ISO 8601;
nonfinite numbers and unsupported values raise an encoding error.

```python
from decimal import Decimal
from flaxon import JSONResponse

@app.get('/balance')
async def balance():
    return JSONResponse({'amount': Decimal('12.30'), 'record_id': 2**60})
```

```json
{"amount":"12.30","record_id":"1152921504606846976"}
```

Update TypeScript types and money handling accordingly. For conventional endpoint
returns, a temporary setting preserves previous output:

```python
# settings.py
JSON_SERIALIZER = 'legacy'
```

Explicit responses select their own mode: `LegacyJSONResponse(data)` or
`JSONResponse(data, legacy=True)`. Read the [complete JSON contract](json-serialization.html).

## Authentication and sessions

- Standard JWTs replace the previous custom token format; existing tokens require
  sign-in again. Configure a trusted algorithm, issuer/audience and rotation keys.
- Password hashing defaults to Argon2id. Legacy PBKDF2 hashes can still be verified;
  successful Admin sign-in upgrades eligible hashes.
- Secure cookie defaults require HTTPS in production. Local development uses the
  generated debug configuration. Persistent secrets must remain stable across
  deployments; use shared session infrastructure for multiple workers.
- Public requests that do not use a session no longer create or save an empty
  session. Existing session cookies retain their supported behavior.
- Typed scalar query parameters are read and validated; invalid values return 422.

See [security upgrade details](request-security-upgrade.html),
[security](../security.html), and [deployment](../deployment.html).

## Performance statements

Flaxon ranked third of six tested frameworks for plaintext and small JSON in the
single-worker ASGI comparison, and fourth for a dynamic route among 1,000 routes.
Those measurements do not establish a universal ranking or performance equivalent
to core Node.js/Go servers. Large-response samples were partly client-limited.

Read the [raw results and methodology](../../benchmarks/cross-runtime/python-framework-results.html)
before quoting a performance claim.

## Release checks

The [release audit](../releases/readiness-audit.html) covers package contents,
installed-wheel starter behavior, migrations, Admin/CMS, browser workflows and
release tooling. It records 913 passing tests and 24 skips in the audited
configuration. Passing tests and an advisory dependency scan do not certify every
deployment or third-party integration.

<span id="preview-teloce-ssr-hydration-and-browser-debugging"></span>

## Teloce SSR, hydration, and browser debugging

These integrations are included in the published 0.3.0 packages. Use the installation above; preview Git commits are no longer needed.

Follow the [Flaxon SSR and debugger guide](teloce-ssr-debugging.html) for a complete scoped-CSS component, explicit public props, metadata, and error policies. Read the [Teloce renderer reference](teloce-ssr-reference.html) for supported expressions, hydration, slots, prerendering, and limits.

SSR renders the initial entry. Later `data-teloce-link` navigation uses the browser router; an outlet page is not automatically a second server-rendered entry. Existing backend-only and client-rendered lessons continue to work. Detailed overlays and the browser reporting endpoint are development-only.

## TypeScript and component checking

```bash
python management.py typecheck
python management.py typecheck --json
python management.py runserver
```

The generated project's manual command checks registered application and module UI files. With `DEBUG = True`, the server also checks on startup and after saved UI/TypeScript/configuration edits. Errors appear in the terminal and development debugger while the server keeps running. Disable the watcher with `app.use_teloce(typecheck=False)`. Production never starts the development watcher; run the manual command in CI.

PyTSCheck is included with Flaxon. The checker inherits the project's `tsconfig.json` for strictness, JSX and aliases; without one, it uses strict ES2022/bundler defaults. Imported npm packages still need their installed declarations. Supported statically imported TypeScript child components validate required props and prop types. Dynamic components, some import forms and heuristic template positions remain limitations. See the [checking guide](typecheck.html).

## Project manager course for Flaxon 0.3.0

The [recording ebook](../fullstack/project-manager/index.html) uses published 0.3.0 dependencies and teaches incremental edits, modules, scoped CSS, ORM models, migrations, Admin/CMS, PWA and deployment. Its companion PDF follows the same release instructions. Start with chapter 1; do not install old vendored preview wheels from a historical course checkout.

Admin setup now accepts your chosen nonempty password up to 128 characters. In development it does not warn about strength; in production it recommends a stronger password without blocking creation. Confirmation must match. This applies to `setup-admin` and `createsuperuser`; web password validation remains separate. See [Admin setup](admin-cms.html#generated-project-admin-setup).
