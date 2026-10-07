# CMS Example

> This older example is retained for compatibility. Use the complete editable
> reference at [full_admin_cms/app.py](../full_admin_cms/app.py) and follow the
> [production guide](../../../guides/admin-cms.md) for current APIs.

This example demonstrates the CMS panel — a small, self-contained,
WordPress/Django-admin-style content manager that ships as two files
(`cms.py` + `cms.html`). It's an optional add-on, independent of
`AdminDashboard`: use it on its own, or mount it alongside a model-based
`AdminDashboard` in the same app.

## Installing the two files

Copy both files into your Flaxon installation, keeping them in the same
relative layout as the built-in admin templates:

```
flaxon/
  admin/
    cms.py
    templates/
      admin/
        cms.html
```

`cms.py` loads `cms.html` from `templates/admin/cms.html` relative to its
own location by default. If you move `cms.html` elsewhere, pass
`template_path=` explicitly when creating `CMS(...)`.

## Running the Example

```bash
# Create a new Flaxon project
flaxon new cms-example

cd cms-example

# Install dependencies
pip install flaxon

# Create app.py with the code below

# Run the application
flaxon run app:app --reload
```

Visit `http://localhost:8000/admin/cms`.

---

# Full Example Code

## app.py

```python
from flaxon import Flaxon
from flaxon.admin.cms import CMS, ContentType, CMSField

app = Flaxon("cms-example", debug=True)

cms = CMS(app, url_prefix="/admin/cms", title="My Site CMS")

cms.register(ContentType(
    name="post",
    label="Post",
    label_plural="Posts",
    fields=[
        CMSField("title", "Title", required=True),
        CMSField("content", "Content", type="richtext"),
        CMSField("featured_image", "Featured Image URL", type="url", required=False),
    ],
    list_display=["title", "status", "updated_at"],
    list_filter=["status"],
    search_fields=["title", "content"],
))

cms.register(ContentType(
    name="page",
    label="Page",
    label_plural="Pages",
    fields=[
        CMSField("title", "Title", required=True),
        CMSField("content", "Content", type="richtext"),
    ],
))


@app.get("/")
async def home():
    return {"message": "Welcome", "cms": "/admin/cms"}
```

Run with `flaxon run app:app --reload`.

---

# Using It Alongside AdminDashboard

`CMS` and `AdminDashboard` don't share any state or registry — they're
fully independent panels that happen to be able to live under the same
`/admin` prefix. Mount both in either order:

```python
from flaxon import Flaxon
from flaxon.admin import AdminDashboard, AdminConfig, admin_model
from flaxon.admin.cms import CMS, ContentType, CMSField

app = Flaxon("combined-example", debug=True)

admin = AdminDashboard(app, config=AdminConfig(site_title="Product Admin"), url_prefix="/admin")

@admin_model(list_display=["id", "name", "price"], fields=["name", "price"])
class Product:
    ...  # see admin-panel.md for the full model

cms = CMS(app, url_prefix="/admin/cms", title="My Site CMS")
cms.register(ContentType(name="post", fields=[CMSField("title", required=True)]))
```

`AdminDashboard` handles `/admin/<model_name>` (e.g. `/admin/product`)
and `CMS` handles everything under `/admin/cms` — its routes are
registered so they always take priority over `AdminDashboard`'s
catch-all `/admin/<model_name>` pattern, so there's no collision
regardless of which one you construct first.

---

# Content Types

A `ContentType` is roughly Django admin's registered model, or
WordPress's custom post type — a named collection of records with a
field schema, search/filter/list configuration, and bulk actions.

```python
ContentType(
    name="post",                 # used in URLs and the JSON API
    label="Post",                # singular display name (auto-derived if omitted)
    label_plural="Posts",        # plural display name (auto-derived if omitted)
    fields=[...],                # list of CMSField
    list_display=["title", "status", "updated_at"],  # columns shown in the list view
    list_filter=["status"],      # exact-match dropdown filters in the list view
    search_fields=["title", "content"],               # fields the search box matches against
    has_status=True,             # adds a draft/published status field + publish/unpublish bulk actions
    has_slug=True,               # adds an auto-generated, unique slug field
    slug_source="title",         # which field the slug is derived from
    order_by="-updated_at",      # default sort (prefix with "-" for descending)
)
```

## Fields

```python
CMSField(
    name="title",
    label="Title",           # display label (auto-derived from name if omitted)
    type="text",              # text | textarea | richtext | boolean | number | date | email | url | select
    required=True,
    choices=None,              # list of strings, required for type="select"
    help_text="",              # shown under the field in the form
    default=None,
)
```

`richtext` renders as a large textarea in the SPA and stores raw HTML —
there's no WYSIWYG editor built in, but the field is there for content
you'll render as HTML on your own site.

## Bulk Actions

Every content type gets `delete` for free, and `publish`/`unpublish` if
`has_status=True`. Register your own:

```python
def archive(content_type, ids):
    for item_id in ids:
        content_type.update(item_id, {"status": "archived"})

my_content_type.register_action("archive", "Archive selected", archive)
```

Registered actions automatically show up in the SPA's bulk-action
dropdown once you select one or more rows.

---

# JSON API

Everything the SPA does goes through a plain JSON API under
`{url_prefix}/api/...` — useful if you want to build your own frontend
against it, or call it from scripts/tests.

| Method | Path | Description |
|---|---|---|
| GET | `/api/config` | Title + schema for every registered content type |
| GET | `/api/stats` | Per-type counts (total / published / draft) |
| GET | `/api/<type>/items` | List items — see query params below |
| POST | `/api/<type>/items` | Create an item |
| GET | `/api/<type>/items/<id>` | Get one item |
| PUT | `/api/<type>/items/<id>` | Partially update an item |
| DELETE | `/api/<type>/items/<id>` | Delete an item |
| POST | `/api/<type>/actions/<action>` | Run a bulk action — body: `{"ids": [...]}` |

## List query params

- `q` — substring search across `search_fields`
- `filter_<field>` — exact match on a field, e.g. `?filter_status=published`
- `order_by` — field name, prefix with `-` for descending
- `page`, `per_page` — pagination (`per_page` capped at 200)

## Example requests

```bash
# Create a post
curl -X POST http://localhost:8000/admin/cms/api/post/items \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello World", "content": "<p>First post</p>"}'

# List published posts, page 1
curl "http://localhost:8000/admin/cms/api/post/items?filter_status=published&page=1"

# Search
curl "http://localhost:8000/admin/cms/api/post/items?q=hello"

# Bulk publish
curl -X POST http://localhost:8000/admin/cms/api/post/actions/publish \
  -H "Content-Type: application/json" \
  -d '{"ids": ["abc123", "def456"]}'
```

A `create`/`update` on a `required` field left out of the request body
returns `400`. Looking up an unknown item id, content type, or action
returns `404`.

---

# The SPA (cms.html)

`cms.html` is a single file — Tailwind + Alpine.js from CDN, no build
step — matching the dark theme used by the rest of the Flaxon admin.
It talks only to the JSON API above, so you can replace it entirely with
your own frontend without touching `cms.py`.

Views (hash-routed, so back/forward and refresh all work):

- `#/` — dashboard: cards for each registered content type with live counts
- `#/<type>` — list view: search, filters, sortable columns, pagination, row selection + bulk actions
- `#/<type>/new` — create form, generated from the type's field schema
- `#/<type>/<id>/edit` — edit form

---

# Persistence

Storage is in-memory (`ContentType.items`, a plain dict) and resets on
restart — fine for demos and prototyping. To back it with a real
database, subclass `ContentType` and override `create`/`update`/`delete`/
`get`/`query`/`stats` to read and write your own storage instead of
`self.items`.

---

# Production Improvements

Recommended next steps:

- Swap in-memory storage for a real database
- Add authentication in front of `/admin/cms` (see `flaxon.security.login_required`)
- Add file/image upload support for media fields instead of raw URL fields
- Add a real rich-text editor for `richtext` fields in `cms.html`
- Add per-content-type permissions if multiple admin users share the panel
