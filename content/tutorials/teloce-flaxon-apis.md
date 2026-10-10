# Lesson 12: Using Teloce and Flaxon APIs

This lesson is a practical map of the public APIs used to build full-stack applications. Start with the [complete guessing game](11-guessing-game.html), then use the tables below to choose the API for your next feature. Each group links to its detailed reference.

The examples target the exact Flaxon and Teloce-Py commits pinned by the guessing-game project. Teloce's npm runtime, standalone runtime, compiler, and generated Flaxon router are different entry points. Use the APIs for the entry point your application actually loads.

## 1. Know where each API runs

| Layer | Use it for | Examples |
| --- | --- | --- |
| Teloce component, in the browser | State, forms, rendering, navigation | `data()`, `computed`, `@click`, `v-model`, `data-teloce-link` |
| Browser platform | HTTP, storage, sockets | `fetch`, `sessionStorage`, `WebSocket`, `AbortController` |
| Flaxon, on the Python server | HTTP, validation, authorization, persistence, Admin | `Flaxon`, `FlaxonModule`, `Schema`, `JSONResponse`, `AdminDashboard` |
| Teloce-Py, during compilation | Generate JavaScript, CSS, and routers | `compile`, `compile_file`, `Builder`, `generate_spa_router` |

A component does not call a Python function directly. It sends an HTTP request; Flaxon validates and authorizes it. Anything placed in component state, browser storage, or `request.compile(..., context)` is visible to the browser.

## 2. Compile a Teloce application with Flaxon

```python
from pathlib import Path
from flaxon import Flaxon, Request

app = Flaxon("My application", debug=True)
app.use_teloce(project_root=Path(__file__).parent, ui_dir="ui")

@app.get("/")
async def home(request: Request):
    return await request.compile("app.html", {"title": "Welcome"})
```

| API | How to use it |
| --- | --- |
| `app.use_teloce(...)` | Register the root UI directory once, before startup. Returns the integration and sets `app.teloce`. |
| `project_root`, `ui_dir`, `entry` | Select the project boundary, source tree, and root component. Source directories must remain inside the project. |
| `build_dir`, `static_url` | Choose the generated output location and browser asset URL; defaults are `.flaxon/build` and `/_flaxon`. |
| `title`, `description`, `lang`, `theme_color`, `favicon` | Set document metadata. Serve the favicon separately. |
| `stylesheets`, `scripts` | Add trusted resources with supported attributes such as `integrity`, `crossorigin`, `defer`, or `async`. These do not bundle or download the resources. |
| `options` | Pass compiler/build settings and routing settings such as `spa_mode` and `spa_base`. Test changes to bundling or runtime options. |
| `await request.compile(entry, context, title=...)` | Return the generated client-rendered shell, not server-rendered component HTML. Pass only public props in context. |
| `app.teloce.build()` | Build registered sources explicitly. Normal Flaxon startup already does this. |
| `app.teloce.register_source(name, directory, routes=...)` | Register an additional unique UI source before serving traffic. |

Development rebuilds on process reload; do not promise browser HMR from `flaxon run --reload`. Production uses `debug=False`, optimized assets, and one build lifecycle per worker. Keep generated output writable.

[Complete integration reference](../api/teloce.html) · [Production lesson](10-production.html)

## 3. Compose features with Flaxon modules

```python
from pathlib import Path
from flaxon.modules import FlaxonModule

catalog = FlaxonModule(
    "catalog",
    ui_dir=Path(__file__).parent / "ui",
    ui_routes={"ProductDetails/[id].js": "/products/:id"},
)

@catalog.get("/products")
async def products():
    return {"items": []}

# In app.py:
app.mount_module(catalog, prefix="/api/catalog")
```

The API URL becomes `/api/catalog/products`. The browser page path is `/products/:id`. The two route namespaces are independent. `ui_routes` keys name generated page files relative to that module's `pages/` directory.

| Module API | When to use it |
| --- | --- |
| `FlaxonModule(name, ui_dir=..., ui_routes=...)` | Keep backend routes and Teloce UI together. |
| `template_dir`, `static_dir` | Add module-owned Jinax templates or static files. |
| `get`, `post`, `put`, `patch`, `delete`, `websocket` | Register module-owned HTTP or WebSocket endpoints. |
| `app.mount_module(module, prefix=...)` | Attach the feature to the application. |
| `module.register_module(child, prefix=...)` | Compose nested features. Cycles are rejected. |
| `module.requires("db")` | Declare a dependency that must exist in the application container at mount time. |
| `before_request`, `after_request`, `errorhandler` | Apply request hooks and error handling to that module's routes. |
| `on_startup`, `on_shutdown` | Manage module resources such as connections or workers. |
| `cli_command`, `as_commands`, `install_cli_commands` | Add module-owned commands. Expose command instances from a project `cli/*.py` file for installed-console discovery. |

In the game, `modules/game` owns the Play page and guessing endpoints. `modules/results` owns Results, the completed-result endpoint, and the Admin adapter.

[Module lesson](07-modules.html) · [Module reference](../guides/modules.html)

## 4. Build pages with template APIs

| Need | Syntax | Use |
| --- | --- | --- |
| Escaped text | `{{ message }}` | Display state or server data. |
| Condition | `<if condition="ready">...</if>` or `v-if="ready"` | Add/remove a branch. |
| Alternate branches | `v-else-if`, `v-else` | Place next to the preceding conditional branch. |
| List | `<for each="item in items">` or `v-for="item in items"` | Render repeated content. |
| Stable identity | `:key="item.id"` | Preserve identity when a list changes. |
| Event | `@click="save"` or `v-on:click="save"` | Run a method. |
| Event modifier | `@submit.prevent="save"` | Prevent the browser's form submission. Other documented modifiers include `.stop`, `.once`, `.self`, and applicable key modifiers. |
| Attribute | `:disabled="busy"` or `v-bind:disabled="busy"` | Bind an attribute to state. |
| Classes/styles | `:class="classes"`, `:style="styles"` | Update appearance from state. |
| Visibility | `:show="visible"` or `v-show="visible"` | Hide/show an existing element. |
| Input | `:model="guess"` or `v-model="guess"` | Synchronize form state. |
| Text content | `v-text="message"` | Set escaped text. |
| Trusted markup | `v-html="trustedHtml"` | Only use previously sanitized HTML; never raw user content. |

```html
<template>
    <form @submit.prevent="save">
        <input v-model="name" required />
        <button :disabled="busy">Save</button>
    </form>
    <p role="status">{{ message }}</p>
</template>
<script>
export default {
    data() {
        return { name: "", busy: false, message: "" };
    },
    methods: {
        async save() {
            this.busy = true;
            try {
                const response = await fetch("/api/items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: this.name }),
                });
                if (!response.ok) throw new Error("Could not save the item.");
                this.message = "Saved.";
            } catch (error) {
                this.message = error.message;
            } finally {
                this.busy = false;
            }
        },
    },
};
</script>
```

This is a component pattern: add the corresponding authenticated/validated Python endpoint and your application's CSRF policy. The guessing game's `client.ts` contains its complete request policy.

[Teloce directives](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/directives.md) · [Components lesson](02-components.html)

## 5. Use component state and lifecycle

| Component option | Purpose |
| --- | --- |
| `name` | Name the component for diagnostics. |
| `props` | Accept parent input; array syntax or documented typed/default/required descriptors. |
| `data()` | Return local reactive state. This is the easiest starting point. |
| `computed` | Derive values such as `isPlaying` without storing duplicate state. |
| `watch` | Run side effects when a watched value changes. Avoid loops that keep rewriting the same value. |
| `methods` | Define readable event handlers and request helpers. |
| `components` | Register imported local child components. |
| `emits`, `$emit(name, detail)` | Declare and dispatch child events. The compiled runtime emits bubbling `teloce:name` DOM events. |
| `filters` | Register presentation transforms, not authorization decisions. |
| `beforeMount`, `mounted` | Initialize DOM-dependent work or fetch initial data. |
| `beforeUpdate`, `updated` | Coordinate external widgets around updates. |
| `beforeUnmount`, `unmounted` | Stop timers, observers, subscriptions, editors, and sockets. |

```html
<script>
import ResultCard from "../components/ResultCard.html";
export default {
    props: ["playerName"],
    components: { ResultCard },
    data() { return { results: [] }; },
    computed: {
        wins() { return this.results.filter(result => result.outcome === "won").length; },
    },
};
</script>
<template>
    <p>{{ playerName }} has {{ wins }} wins.</p>
    <ResultCard v-for="result in results" :key="result.id" :result="result" />
</template>
```

Keep a child's props owned by its parent. Use `<slot>` for parent-supplied content. Use `<style scoped>` for component rules and global shell styles for the shared theme. `<script lang="ts">` and `.ts` helper imports support transpilation; run a separate type checker if you require type diagnostics.

[Teloce components](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/components.md) · [TypeScript lesson](04-typescript.html)

## 6. Navigate with the generated SPA router

```html
<nav>
    <a href="/play" data-teloce-link>Play</a>
    <a href="/results" data-teloce-link>Results</a>
    <a href="/admin/login">Admin</a>
</nav>
<main data-teloce-router-view></main>
```

`data-teloce-link` marks same-origin anchors for client navigation to matched Teloce pages. External links, downloads, modified clicks, other targets, nonmatching routes, and same-page fragments retain normal browser behavior. Do not mark Admin as a SPA page.

The integration mounts the router and exposes it as `window.__TELOCE_ROUTER__`. Use this existing instance for programmatic navigation rather than creating another router:

```javascript
const router = window.__TELOCE_ROUTER__;
await router.push("/results");
await router.replace({ path: "/play", query: { mode: "practice" } });
```

| Router API | Meaning |
| --- | --- |
| `push(target)`, `navigate(target)` | Navigate and add browser history; return whether navigation was accepted. |
| `replace(target)` | Navigate without adding a history entry. |
| `back()`, `forward()`, `go(delta)` | Use browser history. |
| `resolve(path)` | Inspect a route match without navigation; returns no match for unknown paths. |
| `state` | Read `path`, `params`, `query`, `route`, and `fullPath`. |
| `path`, `params`, `query`, `currentRoute` | Read callable route signals. |
| `beforeEach(guard)` | Register a navigation guard; returns a removal function. Guards improve flow but never authorize server data. |
| `afterEach(hook)` | Observe completed navigation; returns a removal function. |
| `subscribe(listener)` | Observe route state; returns an unsubscribe function. |
| `mount(container, context)` | Mount an outlet and return its cleanup function. Flaxon's shell already calls this. |
| `destroy()` | Release router listeners when you own its complete lifecycle. Do not destroy Flaxon's shared router on ordinary page unmount. |

File conventions include `Home.html` → `/`, `Play.html` → `/play`, `games/[id].html` → `/games/:id`, optional `[[id]]` segments, and `[...path]` catch-all segments. Route params and query values are passed to page props by the generated router. Do not treat string route parameters as validated database IDs.

Flaxon's integration defaults to history mode; standalone Teloce builds default to hash mode. History pages require server routes that return the shell on a direct visit. The game registers explicit `/`, `/play`, and `/results` routes so unknown `/api` paths still return 404.

[Routing lesson](06-routing.html) · [Teloce router reference](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/router.md)

## 7. Use explicit signals when state must be shared

Normal component `data()` is already reactive. In a Flaxon-compiled `.html` component, **do not manually import signal helpers**. The project builder emits the shared runtime and the compiler injects named imports for calls to `signal`, `effect`, `computed`, `createSignal`, `createEffect`, `createComputed`, `createMemo`, `batch`, `untracked`, `isSignal`, `isComputed`, `toSignal`, and `getValue` when needed. Existing imports or local declarations are respected.

This complete component needs no runtime URL import:

```html
<template>
    <button @click="increment">{{ count }} clicks</button>
</template>
<script>
const sharedCount = signal(0);
export default {
    data() { return { count: sharedCount() }; },
    mounted() {
        this.counterEffect = effect(() => { this.count = sharedCount(); });
    },
    beforeUnmount() {
        this.counterEffect.stop();
    },
    methods: {
        increment() { sharedCount.update(value => value + 1); },
    },
};
</script>
```

Mirror the signal value into component `data()` for template rendering, and stop owned effects when the page unmounts. Automatic helper imports apply to compiled components in a project build. A separately authored `.ts`/`.js` module or a low-level compiler invocation without `shared_runtime_import` still needs its own imports.

| Signal API | Use |
| --- | --- |
| `createSignal(initial)` | Create callable state; `signal()` reads it. |
| `.get()`, `.set(value)`, `.update(fn)` | Read, replace, or update a value. |
| `.peek()` | Read without collecting a dependency. |
| `.subscribe(listener)` | Listen for changes; returns an unsubscribe function. |
| `createComputed(fn)`, `createMemo(fn)` | Create derived callable state. Stop its `.effect` when you own its lifecycle. |
| `createEffect(fn)` | Run a reactive side effect; returns an object with `.run()` and `.stop()`. |
| `batch(fn)`, `untracked(fn)` | Group updates or suppress dependency collection. |
| `reactive(object)`, `isReactive` | Create/detect a reactive object. |
| `isSignal`, `isComputed`, `toSignal`, `getValue` | Inspect or normalize signal/plain values. |

Do not persist server secrets or trust browser state as a score. The game's Results page rechecks scores with the server.

[Teloce reactivity](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/reactivity.md)

## 8. Add advanced UI behavior deliberately

| API family | How to use it |
| --- | --- |
| `transition:fade`, `in:slide`, `out:fade`, `animate:flip` | Animate branch entry/exit or keyed-list movement. Built-in helpers include fade, slide, and scale. Respect reduced-motion preferences. |
| `use:name="params"` | Attach an action to a DOM node. Return a cleanup function or an object with `update`/`destroy`. |
| `v-virtual-for`, `item-height` | Bound rendered DOM for large lists; normal `v-for` remains the default. |
| `v-memo` | Skip a subtree when its key is unchanged; include every value the subtree reads. |
| `v-data-table` | Add a data table. `createDataTable` offers `update`, `setRows`, `getVisibleRows`, `exportCsv`, and `unmount`. |
| `v-scrolly`, `v-step` | Observe story steps; the runtime emits `teloce:step`. |
| `v-chart-annotation` | Add accessible chart annotations. |
| `poll`, `interval`, `poll-target` | Poll a JSON endpoint, with visibility pausing and cleanup. Secure the Python endpoint. |
| `live` | Use WebSocket URLs or registered live adapters; connections reconnect with backoff and close on teardown. |

The builder automatically emits `data.js` and `table.js`, and the generated shared runtime re-exports their public helpers. No manual runtime installation or extra script tag is required. This does **not** automatically bind every exported name in your component script: unlike the signal-call detection above, a direct call to `loadCsv` still needs a named import. Directive internals such as `v-data-table`, polling, and live updates use the runtime without a user-written helper import.

Data helper exports include `parseDelimited`, `coerce`, `loadCsv`, `exportRowsToCsv`, `downloadText`, `downloadRowsAsCsv`, `exportChartToPng`, and `exportChartToSvg`. They are emitted beside the shared runtime in `/_flaxon/static/data.js`; table helpers live in `/_flaxon/static/table.js`.

```javascript
import { loadCsv, downloadRowsAsCsv } from "/_flaxon/static/data.js";
const rows = await loadCsv("/static/example.csv", { headers: true });
downloadRowsAsCsv(rows, "example.csv");
```

Serve the CSV yourself and authorize private exports on the server. The game does not need these advanced APIs; add them only for a feature that benefits from them.

[Teloce public API](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/api.md)

## 9. Compiler, build, static-rendering, and extension APIs

Most Flaxon applications use `app.use_teloce()` instead of writing a separate pipeline.

| Python API | Use |
| --- | --- |
| `from teloce import compile, compile_file, compile_project` | Compile source text, a file, or a component project. Check diagnostics before serving output. |
| `from teloce.build import Builder, build_project` | Build a project and inspect `compiled`, `failed`, `errors`, `files`, and generated runtime metadata. |
| `generate_router`, `generate_spa_router` from `teloce.router` | Generate a custom declarative router or discover page files. |
| `RouterCompiler`, `RouterGenerator` | Lower-level router building for framework integrations. |
| `to_frontend_data`, `frontend_json`, `DataShapeError` from `teloce` | Convert server records into browser-safe shapes. A field schema is an allowlist; leave private columns out. |
| `render_ssr`, `render_static`, `render_static_component`, `to_jinax_template` | Use Teloce's documented server/static-rendering paths. These do not mean `request.compile()` performs SSR. |
| Python plugins | Extend AST transforms, filters, directives, and compiler hooks through the documented plugin contract. |

```python
from teloce import compile_file
result = compile_file("ui/components/Counter.html", html_mode=True)
if not result["success"]:
    raise RuntimeError(result["diagnostics"])
print(result["code"])
```

Build configuration includes source maps, target syntax, shared runtime, minification, asset hashing, CSS extraction, optional bundling, lazy components, and embed mode. Verify supported options in the pinned source before changing a pipeline. Never compile arbitrary user-submitted source inside a public request.

For a Jinax page enhanced by Teloce, the **standalone runtime** exposes `teloce.createApp` (aliases `create`/`mount`), `registerComponent`, `registerHelper`, `use(plugin)`, and its documented directives, filters, and instance lifecycle. The separate ES-module runtime offers `createComponent`, `createApp`, and `defineAsyncComponent`. Serve the required runtime modules deliberately; do not load standalone and compiled runtimes over the same DOM tree or assume npm-only APIs exist in a compiled Flaxon page.

[Runtime reference](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/runtime-reference.md) · [Standalone runtime](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/standalone-runtime.md) · [Plugins](https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/plugins.md)

## 10. Choose the Flaxon server API for your feature

| Feature | Public entry points | Guide |
| --- | --- | --- |
| HTTP and routing | `Flaxon`, route decorators, `Request`, typed paths | [Routing](../core-concepts/routing.html) |
| Request input | JSON, form, query, headers, cookies, uploaded files | [Requests](../core-concepts/requests.html) |
| Validation | `Schema`, `fields`, typed body parameters | [Validation](../core-concepts/validation.html) |
| Responses | JSON, HTML, redirects, files, streams | [Responses](../core-concepts/responses.html) |
| Middleware | `app.add_middleware`, CORS, trusted hosts, rate limits, security headers | [Middleware](../core-concepts/middleware.html) |
| Authentication | Sessions, JWT, API keys, identity | [Authentication](../guides/authentication.html) |
| Authorization | Roles, permissions, server-side checks | [Authorization](../guides/authorization.html) |
| Database work | Adapters, transactions, migrations | [Databases](../guides/databases.html) |
| Admin/CMS | `AdminDashboard`, `AdminConfig`, `Registry`, model adapters | [Admin and CMS](../guides/admin-cms.html) |
| Live updates | `app.websocket`, `WebSocket`, rooms and broadcast helpers | [WebSockets](../guides/websockets.html) |
| Server templates | `Jinax`, `app.use_templates`, `request.render` | [Jinax](../guides/jinax.html) |
| Background work | Framework tasks and worker integrations | [Tasks](../guides/tasks.html) |
| Application composition | `FlaxonModule`, container dependencies, hooks and commands | [Modules](../guides/modules.html) |
| Testing | HTTP and WebSocket test clients | [Testing](../guides/testing.html) |

The guessing game shows a real `Schema` body, token authorization, `JSONResponse`, transactions, module routes, and read/delete Admin. For larger applications, consult the linked full references rather than adding client-side authorization shortcuts.

## 11. Check your understanding

1. Change the Play page's message using `data()` and interpolation.
2. Add a read-only derived value with `computed`.
3. Navigate to Results through `data-teloce-link` and confirm there is no document reload.
4. Refresh `/results` directly and confirm Flaxon serves the shell.
5. Add an optional module-owned page with `ui_routes` while keeping its API prefix unchanged.
6. Confirm an unauthenticated request cannot read another round or enter protected Admin.
7. Build with `debug=False` and test the generated production assets.

[Previous: complete guessing game](11-guessing-game.html) · [Next: complete .html SPA routing lesson](13-html-spa-routing.html) · [Course contents](index.html)

## Complete Teloce documentation directory

This reference includes all 102 Markdown documents under `docs/` at the pinned Teloce source revision, including its lessons. Teloce documents `.vel` as well as other framework integrations; Flaxon full-stack lessons here focus on compiled `.html` components.

<details><summary>Browse all Teloce documentation and lessons</summary><ul><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/Flask.md">Flask</a> <small>(docs/Flask.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/README.md">Teloce-Py documentation</a> <small>(docs/README.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/about.md">About Teloce-Py</a> <small>(docs/about.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/api.md">Public API</a> <small>(docs/api.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/architecture.md">Architecture</a> <small>(docs/architecture.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/cheatsheet.md">Teloce application cheatsheet</a> <small>(docs/cheatsheet.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/cli.md">Teloce CLI</a> <small>(docs/cli.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/compatibility.md">npm Teloce and Teloce-Py compatibility</a> <small>(docs/compatibility.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/compiler-config.md">Compiler configuration reference</a> <small>(docs/compiler-config.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/compiler.md">Compiler</a> <small>(docs/compiler.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/components.md">Components</a> <small>(docs/components.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/debugging.md">Debugging `.vel` applications</a> <small>(docs/debugging.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/deployment-vercel.md">Deploying Teloce applications to Vercel</a> <small>(docs/deployment-vercel.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/direct-dom.md">Direct DOM updates</a> <small>(docs/direct-dom.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/directives.md">Directives</a> <small>(docs/directives.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/ecosystem.md">Teloce ecosystem</a> <small>(docs/ecosystem.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/errors.md">Errors and diagnostics</a> <small>(docs/errors.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/features.md">Features</a> <small>(docs/features.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/frameworks.md">Framework integration</a> <small>(docs/frameworks.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/funding.md">Funding and support</a> <small>(docs/funding.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/getting-started.md">Getting started: write `.vel`, run `python app.py`</a> <small>(docs/getting-started.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/goal.md">Project goal</a> <small>(docs/goal.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/javascript-typescript-tooling.md">JavaScript, TypeScript, and production bundling</a> <small>(docs/javascript-typescript-tooling.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/jinax-and-vel.md">Jinax and `.vel` together</a> <small>(docs/jinax-and-vel.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/01-first-vel.md">Lesson 1: your first `.vel` file</a> <small>(docs/lessons/01-first-vel.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/02-vel-building-blocks.md">Lesson 2: `.vel` building blocks</a> <small>(docs/lessons/02-vel-building-blocks.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/03-components-and-design.md">Lesson 3: reusable components and fast design</a> <small>(docs/lessons/03-components-and-design.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/04-flaxon-apps.md">Lesson 4: build a Flaxon application with Python</a> <small>(docs/lessons/04-flaxon-apps.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/05-os-simulation.md">Lesson 5: build an OS-style simulation</a> <small>(docs/lessons/05-os-simulation.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/06-production.md">Lesson 6: production delivery</a> <small>(docs/lessons/06-production.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/07-django.md">Lesson 7: Django, admin, and imported .vel components</a> <small>(docs/lessons/07-django.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/08-fastapi.md">Lesson 8: FastAPI CMS with imported .vel components</a> <small>(docs/lessons/08-fastapi.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/09-flask.md">Lesson 9: Flask with imported .vel components</a> <small>(docs/lessons/09-flask.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/10-production-case-study.md">Lesson 10: what the Flaxon OS production build proves</a> <small>(docs/lessons/10-production-case-study.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/11-pwa-and-msix.md">Lesson 11: turn a Teloce-Py app into a PWA and MSIX</a> <small>(docs/lessons/11-pwa-and-msix.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/12-search-engine-showcase.md">Lesson 12: Build a small search engine with `.vel`</a> <small>(docs/lessons/12-search-engine-showcase.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/13-animation-and-threejs.md">Lesson 13: CSS animation and Three.js in `.vel`</a> <small>(docs/lessons/13-animation-and-threejs.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/14-demo-framework.md">Lesson 14: Build a demo UI framework with `.vel`</a> <small>(docs/lessons/14-demo-framework.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/15-plugin-authoring.md">Lesson 15: Create a reusable Teloce plugin</a> <small>(docs/lessons/15-plugin-authoring.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/16-how-teloce-works.md">Lesson 16: How Teloce-Py works under the hood</a> <small>(docs/lessons/16-how-teloce-works.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/17-cli-workflow.md">Lesson 17: The Teloce CLI workflow</a> <small>(docs/lessons/17-cli-workflow.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/18-teloce-showcase.md">Lesson 18: Build the Teloce Motion Lab showcase</a> <small>(docs/lessons/18-teloce-showcase.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/19-signals-and-reactivity.md">Lesson 19: Signals, reactivity, and the browser runtime</a> <small>(docs/lessons/19-signals-and-reactivity.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/20-flaxon-runtime-notebook.md">Lesson 20: Build a Flaxon notebook with the standalone runtime</a> <small>(docs/lessons/20-flaxon-runtime-notebook.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/21-runtime-files-and-router.md">Lesson 21: Runtime files and the router</a> <small>(docs/lessons/21-runtime-files-and-router.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/22-build-a-vel-ide.md">Series: Build a working IDE with `.vel` and Flask</a> <small>(docs/lessons/22-build-a-vel-ide.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/23-production-architecture.md">Production architecture: `.vel`, Python, Jinax, and Flaxon</a> <small>(docs/lessons/23-production-architecture.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/24-lazy-loading-developer-toolbox.md">Build a lazy-loaded developer toolbox</a> <small>(docs/lessons/24-lazy-loading-developer-toolbox.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/25-typescript-in-vel.md">TypeScript with `.vel`: copy-paste workflows</a> <small>(docs/lessons/25-typescript-in-vel.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/26-crud-api.md">Lesson 26: build a real CRUD app with `.vel` and Flask</a> <small>(docs/lessons/26-crud-api.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/27-production-debugging.md">Lesson 27: debug a production `.vel` application</a> <small>(docs/lessons/27-production-debugging.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/28-teloce-config.md">Configure a production Teloce build</a> <small>(docs/lessons/28-teloce-config.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/29-ts-tutoiral.md">TypeScript in `.vel`: a complete practical guide</a> <small>(docs/lessons/29-ts-tutoiral.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/30-Extra-ts.md">TypeScript extras for real Teloce projects</a> <small>(docs/lessons/30-Extra-ts.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/31-advanced-ts.md">Advanced TypeScript architecture with Teloce</a> <small>(docs/lessons/31-advanced-ts.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/32-transitions-and-animations.md">Lesson 32: Transitions and animation directives</a> <small>(docs/lessons/32-transitions-and-animations.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/33-Image-studio-saas.md">Lesson 33: An Image Studio SaaS with FastAPI, Jinax, and Teloce-Py</a> <small>(docs/lessons/33-Image-studio-saas.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/34-teloce-mastery.md">Lesson 34: Teloce-Py Mastery — Compiler Internals, Runtime Mechanics, and Production Builds</a> <small>(docs/lessons/34-teloce-mastery.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/36-signals-in-vel.md">Signals inside `.vel` components</a> <small>(docs/lessons/36-signals-in-vel.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/37-making-a-spa.md">Lesson 37: Make a single-page app with Teloce-Py</a> <small>(docs/lessons/37-making-a-spa.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/38-components-and-attrs.md">Lesson 38: automatic components and `$attrs`</a> <small>(docs/lessons/38-components-and-attrs.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/39-virtual-lists.md">Lesson 39: virtual lists for large datasets</a> <small>(docs/lessons/39-virtual-lists.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/40-data-tables.md">Lesson 40: sortable and filterable tables</a> <small>(docs/lessons/40-data-tables.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/41-data-loading.md">Lesson 41: CSV loading and Python data shaping</a> <small>(docs/lessons/41-data-loading.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/42-memo-performance.md">Lesson 42: skip unchanged subtrees with `v-memo`</a> <small>(docs/lessons/42-memo-performance.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/43-scrollytelling.md">Lesson 43: scrollytelling and chart annotations</a> <small>(docs/lessons/43-scrollytelling.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/44-sharing-and-exports.md">Lesson 44: shareable state and exports</a> <small>(docs/lessons/44-sharing-and-exports.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/45-live-data.md">Lesson 45: polling and live data</a> <small>(docs/lessons/45-live-data.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/46-use-actions.md">Lesson 46: direct DOM behavior with `use:`</a> <small>(docs/lessons/46-use-actions.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/47-static-and-embed.md">Lesson 47: static components, SSR, and embed builds</a> <small>(docs/lessons/47-static-and-embed.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/README.md">Teloce-Py and Flaxon lessons</a> <small>(docs/lessons/README.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/fast-dev-facts.md">Fast Dev-Facts: speed up Teloce development</a> <small>(docs/lessons/fast-dev-facts.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/file-structure.md">Optimized Teloce project structure</a> <small>(docs/lessons/file-structure.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/lessons/shared runtime.md">Shared runtime and small component bundles</a> <small>(docs/lessons/shared runtime.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/minifyjs.md">MinifyJS: native production builds</a> <small>(docs/minifyjs.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/multiple-html-pages.md">Multiple HTML files with `.vel`</a> <small>(docs/multiple-html-pages.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/npm-migration.md">Migrating from npm Teloce</a> <small>(docs/npm-migration.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/npm-python.md">npm Teloce and Python Teloce</a> <small>(docs/npm-python.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/plugins.md">Plugins, filters, and directives</a> <small>(docs/plugins.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/production.md">Production checklist</a> <small>(docs/production.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/python-Framework.md">Python framework support</a> <small>(docs/python-Framework.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/reactivity.md">Reactivity</a> <small>(docs/reactivity.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/real-world-examples.md">Real-world examples</a> <small>(docs/real-world-examples.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/router.md">Router</a> <small>(docs/router.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/runtime-reference.md">Runtime API reference</a> <small>(docs/runtime-reference.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/scoped-css.md">Scoped CSS</a> <small>(docs/scoped-css.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/security.md">Security guide</a> <small>(docs/security.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/sfc.md">Single File Components</a> <small>(docs/sfc.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/standalone-runtime.md">Standalone runtime</a> <small>(docs/standalone-runtime.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/status.md">Teloce-Py status and compatibility</a> <small>(docs/status.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/structure.md">Teloce project structure</a> <small>(docs/structure.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/studio.md">How the Teloce Studio prototype was built</a> <small>(docs/studio.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/support.md">Support</a> <small>(docs/support.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/team-workflow.md">Team workflow</a> <small>(docs/team-workflow.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/teloce-npm.md">Teloce npm compatibility</a> <small>(docs/teloce-npm.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/template-syntax.md">Template syntax</a> <small>(docs/template-syntax.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/testing.md">Testing Teloce-Py</a> <small>(docs/testing.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/troubleshooting.md">Troubleshooting guide</a> <small>(docs/troubleshooting.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/vel-syntax.md">`.vel` syntax</a> <small>(docs/vel-syntax.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/vel.md">The `.vel` file format</a> <small>(docs/vel.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/vscode.md">VS Code extension</a> <small>(docs/vscode.md)</small></li><li><a href="https://github.com/aldanedev-create/teloce-py/blob/10f786b9ce99cf62cb2e154a913843b027b20ee7/docs/workflow.md">Development workflow</a> <small>(docs/workflow.md)</small></li></ul></details>

## Optional SSR and integrated debugging

The client-rendered workflow above remains supported. To render the initial `.html` entry on the server, follow the [Flaxon SSR and debugger guide](../guides/teloce-ssr-debugging.html) and [Teloce SSR reference](../guides/teloce-ssr-reference.html). Use explicit public props, SSR-compatible templates, and matching packages from the [preview installation guide](../guides/latest-upgrade.html#preview-teloce-ssr-hydration-and-browser-debugging).

`data-teloce-link` still handles subsequent browser navigation. With `debug=True`, runtime errors, hydration diagnostics, and failed same-origin API requests appear in the overlay and `/__debug__`, with request IDs connecting API failures to Python errors. Production disables this development client and reporting endpoint.
