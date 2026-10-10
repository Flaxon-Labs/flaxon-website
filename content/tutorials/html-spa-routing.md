# Lesson 13: Complete SPA routing with Flaxon and Teloce .html

Build a working three-page SPA using `.html` single-file components, `data-teloce-link`, and Flaxon's Teloce integration. This lesson supplies every application file. Use the dependency pins from the [guessing game](11-guessing-game.html), which includes a larger module-based project and production deployment.

## How Flaxon works with Teloce

1. You author `.html` components containing `<template>`, optional `<script>`, and optional `<style>` sections. They are compiler inputs, not raw static HTML or Jinax templates.
2. `app.use_teloce()` registers the source trees and a startup build. It compiles components, emits the shared browser runtime, discovers `pages/`, and generates a router. It also registers the generated asset endpoint at `/_flaxon`.
3. A Flaxon page endpoint returns `await request.compile("app.html", context)`. The response is an HTML document that loads the compiled root component and mounts the generated router into the marked outlet.
4. Teloce runs in the browser. A normal click on a matching `data-teloce-link` anchor changes the current page without reloading the document. Back and Forward use the same router.
5. `fetch()` requests still reach Python endpoints. Flaxon owns validation, authentication, authorization, secrets, and database work.

Flaxon's integration defaults to history routing. The browser and server must both recognize direct page URLs. This tutorial uses explicit server routes so unknown APIs cannot accidentally return a successful SPA document.

## 1. Create the project

Create a folder containing these paths:

| File | Responsibility |
| --- | --- |
| `requirements.txt` | Verified dependency pins; copy from the capstone |
| `app.py` | Configure Flaxon, serve page URLs, and implement JSON APIs |
| `ui/app.html` | Persistent navigation and router outlet |
| `ui/pages/Home.html` | `/` |
| `ui/pages/About.html` | `/about` |
| `ui/pages/users/[id].html` | `/users/:id` |

Install and run from the project folder:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Or macOS/Linux:
# source .venv/bin/activate
python -m pip install -r requirements.txt
flaxon run app:app --reload
```

You can also run `python -m flaxon run app:app --reload`. No separate Teloce CLI build or hand-written router initialization is needed for this Flaxon application.

## 2. app.py

```python
from pathlib import Path
from flaxon import Flaxon, Request
from flaxon.http import JSONResponse

ROOT = Path(__file__).resolve().parent
app = Flaxon("Routing lesson", debug=True)
app.use_teloce(project_root=ROOT, ui_dir="ui", title="Routing lesson")

@app.get("/api/users/<int:user_id>")
async def user(user_id: int):
    # Public fixture data; replace with authenticated database access later.
    users = {1: {"id": 1, "name": "Avery"}, 2: {"id": 2, "name": "Jordan"}}
    if user_id not in users:
        return JSONResponse({"error": "User not found."}, status_code=404)
    return users[user_id]

@app.get("/")
@app.get("/about")
@app.get("/users/<int:user_id>")
async def page(request: Request, user_id: int = 0):
    return await request.compile("app.html", {"siteName": "Flaxon routing lesson"})
```

The Python route `/users/<int:user_id>` serves the shell on a direct visit. Teloce's generated `/users/:id` route selects the browser page and passes the `id` parameter as a prop. The `/api/users/<int:user_id>` route returns JSON. These routes have different jobs.

Unknown server page URLs and unknown APIs return framework errors; they do not become the home page. If you choose a broad SPA catch-all later, register explicit API-not-found behavior and keep Admin/static namespaces out of that fallback.

## 3. ui/app.html

```html
<template>
    <div class="shell">
        <header>
            <h1>{{ siteName }}</h1>
            <nav aria-label="Main navigation">
                <a href="/" data-teloce-link>Home</a>
                <a href="/about" data-teloce-link>About</a>
                <a href="/users/1" data-teloce-link>Avery</a>
                <a href="/users/2" data-teloce-link>Jordan</a>
            </nav>
        </header>
        <main data-teloce-router-view></main>
    </div>
</template>
<script>
export default { props: ["siteName"] };
</script>
<style>
body { margin: 0; font-family: system-ui, sans-serif; color: #172338; }
.shell { max-width: 48rem; margin: 2rem auto; padding: 1rem; }
nav { display: flex; flex-wrap: wrap; gap: 1rem; }
main { padding-top: 2rem; }
a { color: #17638a; }
a:focus-visible, button:focus-visible { outline: 3px solid #0ea5e9; }
</style>
```

The root component remains mounted while the outlet swaps pages. Use one outlet and let Flaxon mount its router once. Do not add a competing `pushState()` click handler.

## 4. ui/pages/Home.html

```html
<template>
    <section>
        <h2>Home</h2>
        <p>The navigation above changes pages without reloading this document.</p>
        <a href="/about" data-teloce-link>Read about this application</a>
    </section>
</template>
```

## 5. ui/pages/About.html

```html
<template>
    <section>
        <h2>About</h2>
        <p>Flaxon serves HTTP and APIs. Teloce compiles and runs the browser UI.</p>
        <a href="/users/1" data-teloce-link>Open a dynamic user page</a>
    </section>
</template>
```

## 6. ui/pages/users/[id].html

```html
<template>
    <section>
        <h2>User details</h2>
        <p v-if="loading" role="status">Loading user…</p>
        <p v-else-if="error" role="alert">{{ error }}</p>
        <p v-else>{{ user.name }} (user {{ user.id }})</p>
        <a href="/" data-teloce-link>Back home</a>
    </section>
</template>
<script>
export default {
    props: ["id"],
    data() { return { user: null, loading: true, error: "" }; },
    async mounted() {
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(this.id)}`);
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || "Could not load this user.");
            this.user = body;
        } catch (error) {
            this.error = error.message;
        } finally {
            this.loading = false;
        }
    },
};
</script>
```

The router mounts a new page when navigation changes. Its `mounted()` hook loads that user's data. Server authorization is still required for private users, even if the browser page is hidden behind a navigation guard.

## 7. Understand data-teloce-link precisely

| Anchor | Behavior |
| --- | --- |
| `<a href="/about" data-teloce-link>` | Client navigation when the router matches `/about` |
| `<a href="/users/2" data-teloce-link>` | Dynamic client navigation with `id="2"` |
| `<a href="/users/2?tab=profile" data-teloce-link>` | Route params and query values are passed to the page; declare the props you need |
| `<a href="/admin/login">` | Normal navigation to protected server-rendered Admin |
| External URL | Normal browser navigation, even if accidentally marked |
| `download` or another `target` | Normal browser behavior |
| Ctrl/Command/Shift click | Normal browser behavior, including opening another tab |
| Same-page fragment | Normal fragment behavior |
| Marked URL with no matching client route | Normal server navigation; ensure the server returns the intended 404/page |

The attribute belongs on an anchor with a real `href`, not on an arbitrary button. Real links remain useful for opening a new tab, copying a URL, and accessibility. Do not set every link to `href="#"`.

## 8. Programmatic navigation, guards, and cleanup

When a workflow needs navigation after saving, use the existing integration router:

```javascript
await window.__TELOCE_ROUTER__.push("/about");
await window.__TELOCE_ROUTER__.replace({ path: "/users/1", query: { tab: "profile" } });
window.__TELOCE_ROUTER__.back();
```

`push` adds history; `replace` replaces the current entry. `resolve` checks a route without navigating. `beforeEach` and `afterEach` return removal functions. Store and call those removers from `beforeUnmount()` if a page registers hooks. Do not destroy the application router when a single page leaves.

Stop owned effects, intervals, observers, and sockets when a page unmounts. Ordinary `signal()`, `effect()`, and related calls inside compiled `.html` scripts receive compiler-generated imports; they do not require hand-written runtime URLs. See [the corrected API lesson](12-teloce-flaxon-apis.html) for the difference between automatic signal bindings and explicit data-helper imports.

## 9. Move pages into Flaxon modules

For a feature-owned UI:

```python
from pathlib import Path
from flaxon.modules import FlaxonModule

users = FlaxonModule(
    "users",
    ui_dir=Path(__file__).parent / "ui",
    ui_routes={"Details/[id].js": "/users/:id"},
)

@users.get("/<int:user_id>")
async def user(user_id: int):
    return {"id": user_id}

# In app.py, before startup:
app.mount_module(users, prefix="/api/users")
```

The `ui_routes` key is the **generated** filename under that module's `pages/`: author `ui/pages/Details/[id].html`, map `Details/[id].js`. All module UI trees participate in one build and one router. Backend prefixes do not automatically prefix browser routes. Duplicate client routes fail the build; avoid naming two module pages `Home.html` unless you explicitly give them distinct paths.

Use the [complete guessing game](11-guessing-game.html) to see two working feature modules, the root shell, protected Admin, persistence, setup, and Render deployment together.

## 10. Test the complete flow

- Open `/`, then click About and both user links. Confirm the browser has no module errors.
- In DevTools, set `window.navigationCheck = 42`, click a marked link, and read it again. It remains `42` because the document was not reloaded.
- Refresh `/users/2` and open the same URL in a new tab. Both must work.
- Use Back and Forward; verify the selected user changes correctly.
- Open `/users/99` and confirm a visible data error, not a broken component.
- Request `/api/missing`; confirm it returns an error instead of the SPA shell.
- Check modified clicks, mobile navigation, keyboard focus, and production-generated assets.

[Previous: Teloce and Flaxon APIs](12-teloce-flaxon-apis.html) · [Course contents](index.html)

## Optional SSR and integrated debugging

The client-rendered workflow above remains supported. To render the initial `.html` entry on the server, follow the [Flaxon SSR and debugger guide](../guides/teloce-ssr-debugging.html) and [Teloce SSR reference](../guides/teloce-ssr-reference.html). Use explicit public props, SSR-compatible templates, and matching packages from the [preview installation guide](../guides/latest-upgrade.html#preview-teloce-ssr-hydration-and-browser-debugging).

`data-teloce-link` still handles subsequent browser navigation. With `debug=True`, runtime errors, hydration diagnostics, and failed same-origin API requests appear in the overlay and `/__debug__`, with request IDs connecting API failures to Python errors. Production disables this development client and reporting endpoint.
