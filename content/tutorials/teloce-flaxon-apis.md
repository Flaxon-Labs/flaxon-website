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

Normal component `data()` is already reactive. Use signals for shared browser modules or standalone enhancements. Flaxon's generated build exposes `signals.js` at `/_flaxon/static/signals.js` with its scheduler beside it:

```javascript
import { createSignal, createComputed, createEffect, batch } from "/_flaxon/static/signals.js";

const score = createSignal(0);
const doubled = createComputed(() => score() * 2);
const logger = createEffect(() => console.log(doubled()));
batch(() => {
    score.set(1);
    score.update(value => value + 1);
});
// When this feature is destroyed:
logger.stop();
doubled.effect.stop();
```

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
result = compile_file("ui/components/Counter.vel")
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

[Previous: complete guessing game](11-guessing-game.html) · [Course contents](index.html)
