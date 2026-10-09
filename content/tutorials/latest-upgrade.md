# Upgrade to the latest Flaxon workflow

This website tracks the current Flaxon source. A published PyPI version can lag
behind these pages. Check the [changelog](../changelog.html) before upgrading;
the recent JSON and authentication changes require client migration.

## Choose your installation

For the published package:

```bash
python -m pip install --upgrade "flaxon[standard,admin]"
```

To try the exact framework revision used for these docs in a separate environment:

```bash
python -m venv .venv
# Activate .venv using your platform's command, then:
python -m pip install "flaxon[standard,admin] @ git+https://github.com/aldanedev-create/flaxon.git@f4ab3cd440234750f6220ee2fc107dde58b93132"
```

Pin a tested version or commit in production. Do not treat a source installation
as a new PyPI release. Keep backups and exercise your application before rollout.

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
