# Building Flaxon Plugins

How the plugin system actually works under the hood, and the specific mistakes that will bite you if you don't know about them — every one of these was found by actually building and testing a real plugin, not guessed at.

## The shape of a plugin

```python
from flaxon.plugins import Plugin

class MyPlugin(Plugin):
    name = "my-plugin"
    version = "0.1.0"
    description = "What this plugin does."
    author = "you"

    def setup(self, app):
        """Called once, when the plugin is loaded. Register routes, set
        attributes on app, add middleware -- whatever your plugin does."""
        ...

    def on_load(self) -> None:
        """Called right after setup(), on load."""

    def on_startup(self) -> None:
        """Called during the app's ASGI lifespan startup."""

    def on_shutdown(self) -> None:
        """Called during the app's ASGI lifespan shutdown."""
```

Only `setup()` is required (it's abstract). Everything else defaults to doing nothing.

For a plugin that's just "run this one function," skip the subclass entirely:

```python
from flaxon.plugins import SimplePlugin

def setup_hello(app):
    @app.get("/hello")
    async def hello():
        return {"hello": "world"}

plugin = SimplePlugin(name="hello", setup_func=setup_hello)
```

## Loading it

```python
await app.plugins.load_plugin(MyPlugin())
```

`app.plugins` is a `PluginManager`, created automatically on every `Flaxon` app — you don't set anything up for this to exist. `load_plugin()` calls `setup(app)` then `on_load()` immediately. `on_startup()`/`on_shutdown()` fire later, automatically, during the app's real ASGI lifespan events — you don't call those yourself.

## Mistake #1: `app` in `setup(app)` is the real `Flaxon` instance — but that's *not* what `app` means everywhere else

This is the single most confusing thing about the codebase, and it caused a real, hard-to-find bug while this framework was being built. Two completely different conventions use the same parameter name:

- **`Plugin.setup(self, app)`** — `app` is the actual `Flaxon` application instance. `app.get(...)`, `app.container`, `app.sessions` — all real, all there.
- **ASGI middleware's `__init__(self, app)`** (`RequestIDMiddleware`, `CORSMiddleware`, anything you pass to `app.add_middleware(...)`) — `app` there means "the next handler in the middleware chain," which is **not** the `Flaxon` instance. It has no `.container`, no `.sessions`, nothing — it's just a callable.

If your plugin needs to configure something that also happens to be a middleware class, don't try to reach the real app through the middleware's `app` parameter — it isn't there. Pass what you need in explicitly instead:

```python
# Wrong -- self.app inside the middleware is the next handler, not your Flaxon app
class BadMiddleware:
    def __init__(self, app):
        self.app = app
    async def __call__(self, scope, receive, send):
        schema = scope.get("app").some_attribute  # scope["app"] isn't set yet at this point either!

# Right -- pass what the middleware needs directly, at construction time
def setup(self, app):
    app.add_middleware(SomeMiddleware, my_config=app.some_attribute)
```

Also worth knowing: `scope["app"]` (the actual Flaxon instance, reachable from inside a route handler via `request.app`) isn't populated until routing/dispatch actually starts — middleware runs *before* that point, so `scope.get("app")` is still `None` when your middleware's `__call__` first runs.

## Mistake #2: if your plugin adds decorators, they need `functools.wraps` — or Flaxon can't see your route's real parameters

Flaxon resolves a route handler's parameters (`request`, path params, `Schema`-typed bodies, container-registered dependencies) by inspecting its actual function signature with `inspect.signature()`. If your plugin provides a decorator and that decorator's inner wrapper is just `async def wrapper(*args, **kwargs)` without `@functools.wraps(func)`, Flaxon sees a generic `*args, **kwargs` signature instead of the real one — and crashes with `TypeError: Cannot resolve endpoint parameter 'args'` the moment anyone uses your decorator on a route with any parameters at all.

```python
import functools

def my_required(func):
    @functools.wraps(func)          # <- without this line, every protected route breaks
    async def wrapper(*args, **kwargs):
        # ... your check ...
        return await func(*args, **kwargs)
    return wrapper
```

This exact bug existed in four of Flaxon's own built-in security decorators (`jwt_required`, `role_required`, `permission_required`, `api_key_required`) until it was found and fixed — it's an easy thing to miss and a confusing thing to debug from the outside, since the error points at `args`/`kwargs`, not at your decorator.

## Mistake #3: don't mutate `self.requires`/`self.provides` without knowing they're shared by default

```python
class PluginA(Plugin):
    def setup(self, app): ...

a = PluginA()
a.requires.append("database")  # this used to also affect every OTHER Plugin subclass
```

This was a real bug: `requires`/`provides` defaulted to the exact same mutable list shared across every `Plugin` subclass, so appending to one plugin's list silently polluted every unrelated plugin in the process. It's fixed now — each subclass gets its own independent list automatically — but the underlying lesson still matters: declare them at the class level if you want a fixed, known list —

```python
class MyPlugin(Plugin):
    requires = ["database", "cache"]
```

— rather than building them up with `.append()` at runtime, which is more fragile regardless of the underlying fix.

## Testing a plugin properly

`load_plugin()` and the lifespan hooks are both async, and `on_startup`/`on_shutdown` only fire through the app's real ASGI lifespan protocol — not just by calling `load_plugin()`. To test a plugin fully, including its lifecycle hooks:

```python
import asyncio
from flaxon import Flaxon
from flaxon.testing import TestClient

app = Flaxon("plugin-test")

async def load_and_start():
    await app.plugins.load_plugin(MyPlugin())

    messages = [{"type": "lifespan.startup"}, {"type": "lifespan.shutdown"}]
    async def receive():
        return messages.pop(0)
    async def send(message):
        pass

    await app._handle_lifespan(receive, send)

asyncio.run(load_and_start())

# Now test normally -- setup() and on_startup() have both already run
client = TestClient(app)
response = client.get("/hello")
```

## Packaging it as a real, installable plugin

A plugin is just a small, separate Python package that depends on `flaxon` — not something you fork the framework to add.

```
flaxon_myplugin/
├── __init__.py       # exports your Plugin subclass
pyproject.toml
README.md
```

```toml
# pyproject.toml
[project]
name = "flaxon-myplugin"
dependencies = ["flaxon>=0.1.4"]
dynamic = ["version"]

[tool.setuptools.dynamic]
version = {attr = "flaxon_myplugin.__version__"}
```

Build and publish it exactly like any other Python package: `python -m build`, then `twine upload dist/*`. Users add it with `pip install flaxon-myplugin` and `await app.plugins.load_plugin(MyPluginClass(...))`. `flaxon-ffd` (a plugin bridging FastAPI/Flask/Django apps into Flaxon via `app.mount_asgi()`) is a complete, real example of this exact shape if you want to see a working reference.

## Checklist before you ship a plugin

- [ ] `setup(app)` only *registers* things (routes, middleware, container entries) — it shouldn't block or do slow work; save that for `on_startup()`.
- [ ] Any decorator you export uses `@functools.wraps(func)`.
- [ ] If your plugin needs config from the app, take it as a constructor argument to your `Plugin` subclass, not by reaching into `app` inside a middleware.
- [ ] `requires`/`provides` are declared once at the class level, not mutated at runtime.
- [ ] You've tested `on_startup()`/`on_shutdown()` through a real simulated lifespan, not just called `setup()` directly.