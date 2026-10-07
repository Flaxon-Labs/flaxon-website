# Full-stack capstone: a guessing-game SPA

Finish the course by building and deploying a complete application: a single-page guessing game, a Python API, SQLite persistence, and protected Flaxon Admin for managing completed results.

This capstone uses **Flaxon + Teloce with feature modules**. Flaxon compiles Teloce single-file components, discovers module-owned pages, and serves a shared SPA shell. `data-teloce-link` handles client navigation. Python modules validate API requests and persist results. No Node.js build is required. The backend-only and Jinax lessons remain available for readers who choose those architectures.

## What you will build

- `/play`: start a round and guess a number from 1 to 100 in ten attempts.
- `/results`: see completed rounds played in the current browser tab.
- `/api/games/`: create rounds; token-protected endpoints read state and accept guesses.
- `/admin/game_results`: authenticated result browsing and deletion. Scores cannot be manually created or edited.
- `/healthz`: Render's health check.

The server stores the secret number, hashes the access token, and calculates every score. The browser never receives an unfinished round's answer. Completed results and Admin users survive restarts using SQLite on persistent storage.

[Download the complete project](../../downloads/flaxon-guessing-game.zip). All required files are also included below, with their exact paths.

## 1. Set up locally

Use Python 3.11 or newer and Git. Extract the download into `guessing-game/`, then open a terminal there:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

Install and initialize:

```bash
python -m pip install -r requirements.txt
python management.py migrate
python management.py createsuperuser
flaxon run app:app --reload
```

Enter your own Admin username, email, and strong password when prompted. Password input is hidden. There are no default credentials. Open <http://127.0.0.1:8000/play>. You can also start with `python -m flaxon run app:app --reload`.

The `.python-version` file selects Python 3.12 on Render and allows its latest available security patch. Keep your local Python installation updated as well.

The requirements pin the exact Flaxon and Teloce-Py Git commits used to verify this tutorial, rather than assuming that a PyPI package with the same version number contains these APIs. Upgrade the pin deliberately after running the tests.

## 2. Understand the SPA and API

The application has three Teloce pages: Home (`/`), Play (`/play`), and Results (`/results`). `ui/app.html` is the persistent shell. Its `<main data-teloce-router-view>` receives the selected page; navigation anchors use `data-teloce-link`.

Flaxon serves the shell at all three URLs, so direct links and refreshes work. Its integration builds and mounts the router automatically. Do not add another `history.pushState()` listener or mount a second router. Admin links remain ordinary anchors because Admin is a protected server-rendered area.

| Owner | Python responsibility | Teloce responsibility |
| --- | --- | --- |
| `app.py` | Configure middleware, mount modules, initialize Admin, serve the shell | Register the root `ui/` tree |
| `modules/game/` | Validate guesses and manage SQLite rounds | `ui/pages/Play.html` and the shared API helpers |
| `modules/results/` | Return token-protected completed results; register the Admin adapter | `ui/pages/Results.html` |
| `ui/` | No database or authorization code | Persistent shell and Home page |

`app.mount_module(game, prefix="/api/games")` gives `@game.post("/")` the full URL `/api/games/`. The trailing slash belongs to this endpoint. `app.mount_module(results, prefix="/api/results")` gives `@results.get("/<game_id>")` the full URL `/api/results/<game_id>`. These backend prefixes do not change the browser page URLs `/play` and `/results`.

Each `FlaxonModule(..., ui_dir=...)` contributes pages to the shared router. Keep module UI directories inside the project root. For a different page path, pass an explicit `ui_routes` mapping rather than changing API prefixes.

The shared browser helper is `modules/game/ui/client.ts`. It uses ordinary JavaScript syntax in a TypeScript-compatible file so Teloce's project builder emits the helper as `client.js` and rewrites the component imports. The component scripts remain normal JavaScript. TypeScript transpilation does not perform type checking.

`POST /api/games/` returns a random round ID and a one-time access token. Store that token only with the player's round in `sessionStorage`. Send it as `X-Game-Token` when reading or guessing. The Results page checks completed rounds through `/api/results/{id}` instead of trusting cached scores. The public round ID alone cannot authorize access. Keep the token out of URLs and logs.

`POST /api/games/{id}/guesses` accepts `{"value": 50}`. The response includes `higher`, `lower`, or `correct`, the server's attempt count, and the round outcome. The number is revealed only when a round ends. A round expires after one hour. A SQLite transaction ensures concurrent guesses cannot overwrite the attempt count.

Mutation requests require `X-Game-Client: flaxon-spa` and reject foreign browser origins. Do not add permissive CORS to this app. The custom header causes cross-origin browser requests to preflight, which this application does not permit.

## 3. Complete project files

Create each file at the path shown. The download already contains this exact structure.

<!-- PROJECT_FILES -->

## 4. Manage results with Admin

1. Visit `/admin/login` and sign in with the account created by `management.py createsuperuser`.
2. Enable MFA from the profile page and keep recovery codes somewhere secure.
3. Open **GameResult** (the `game_results` registry entry). Browse completed rounds, filter by outcome, and search by round ID.
4. Delete a result when needed. Creation and editing are disabled by permission hooks and by the model adapter, so the dashboard cannot manufacture or rewrite a score.
5. Use Admin's users and roles screens to manage staff. Grant only the permissions they need; do not share the administrator account.

The adapter exposes no secret numbers, token hashes, or active rounds. Admin sessions and users are stored in `DATA_DIR/admin.sqlite3`. Gameplay resides in `DATA_DIR/games.sqlite3`.

If you create another Admin while the application is running, restart the process so it loads the updated user store. Do not commit the data directory or passwords.

## 5. Run the tests

```bash
python -m pip install pytest httpx
python -m pytest test_game.py -q
```

The tests cover access tokens, validation, server-owned scores, foreign-origin rejection, protected Admin, deep links, generated Teloce assets and module routes, ten-attempt losses, expiration, concurrent guesses, and the read/delete Admin adapter.

Play through a round yourself. Switch between Play and Your results, use Back/Forward, refresh `/results`, and verify that Admin shows the completed result. Opening a new browser tab intentionally starts a separate local history.

## 6. Deploy to Render

This example uses a **paid web service with a persistent disk**, one instance, and one Uvicorn worker. Render's free filesystem does not persist these SQLite files across redeploys. Review current pricing before creating a service.

1. Copy this project into the root of your own GitHub repository. Commit the application files and `render.yaml`, excluding `.venv`, `data`, secrets, and backups.
2. In Render, choose **New → Blueprint**, connect that repository, and select the supplied `render.yaml`. If you keep the example inside a larger repository, set the service's root directory to its folder instead.
3. Review the Starter service and 1 GB disk before applying the Blueprint. `DATA_DIR=/var/data` stores both databases and uploads under the persistent mount.
4. Render generates `FLAXON_SECRET_KEY`. `APP_ENV=production` disables debug mode and makes Admin cookies Secure. Render's `RENDER_EXTERNAL_HOSTNAME` supplies the trusted hostname. For a custom domain, add it to `ALLOWED_HOSTS` as a comma-separated hostname list, with no scheme or path.
5. The build installs dependencies. Flaxon compiles the root and module-owned Teloce trees at startup, emits their shared router and CSS, and serves them at `/_flaxon`. Production compilation uses MinifyJS and asset hashing. Keep `.flaxon/` writable and exclude it from Git. The **start command** runs migrations before Uvicorn listens on `0.0.0.0:$PORT`. Persistent disks are unavailable during build and pre-deploy commands, so do not move SQLite migration there.
6. Wait for `/healthz` to become healthy, then open `https://YOUR-SERVICE.onrender.com/play`.
7. In the running service's **Shell**, run `python management.py createsuperuser`. The shell can access the mounted disk. Restart the service after creating the account, then log in through the HTTPS URL at `/admin/login`.
8. Play a round, inspect its completed result in Admin, redeploy, and verify that the result and account remain available.

The start command disables proxy-header trust. This avoids trusting arbitrary forwarded client IPs; the included rate limiter may therefore group requests by the proxy's address. Before public traffic, configure rate limiting at your trusted edge, or configure Uvicorn's forwarded-header allowlist for the actual trusted proxy network. Do not use an unrestricted forwarded-header allowlist as a shortcut.

Persistent disks limit this deployment to a single instance and introduce a short interruption during redeployment. To scale horizontally, migrate gameplay and Admin persistence to shared database/session infrastructure and test the new topology.

Official references: [Render persistent disks](https://render.com/docs/disks), [Blueprint configuration](https://render.com/docs/blueprint-spec), and [deployment commands](https://render.com/docs/deploys).

## 7. Production operations

- Keep production debug disabled, use HTTPS, restrict trusted hosts, and keep same-origin API requests.
- Configure edge request limits and monitor 429 responses. The example's in-process limiter resets on restart and is not a distributed abuse-prevention system.
- Set a result-retention policy and delete old results through Admin or an audited maintenance command. Expired unfinished games are pruned when a new round is created; finished results remain until deleted.
- Back up both databases using `python management.py backup --destination /var/data/backups`. This uses SQLite's backup API rather than copying live WAL files. Move the backup files to separate durable storage; a copy on the same disk is not sufficient disaster recovery.
- Test restoration in a separate environment, monitor disk usage, and review Admin users and MFA periodically.
- Keep dependencies and the framework pin updated after testing. Add logging, alerts, and load tests for your expected traffic before a public launch.

## Troubleshooting

**Missing table:** run `python management.py migrate` in the same environment and `DATA_DIR` as the application.

**Admin login fails after bootstrap:** restart the process; verify the command ran against the persistent disk, not a local or build environment.

**403 from gameplay:** include `X-Game-Client: flaxon-spa`, keep the frontend and API on the same origin, and verify the deployment hostname. Use HTTPS in production.

**404 from a round:** its token is missing/incorrect, or an expired unfinished round has been pruned. Start a new game.

**Results vanish after redeploy:** check that both SQLite files are under `/var/data` and that the persistent disk is attached.

**Deep links fail:** deploy as the Python web service, not as a static site. Flaxon serves the compiled Teloce shell at `/play` and `/results`.

You now have a complete SPA with a protected administration interface and a reproducible deployment. Continue improving it with reusable Teloce components, account-based history, accessibility tests, or a shared production database when those features fit your application.

[Next lesson: Teloce and Flaxon API guide](12-teloce-flaxon-apis.html) · [Course contents](index.html)
