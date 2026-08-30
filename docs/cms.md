# CMS Authoring

The CMS is available at `/admin/cms/` after Admin login. It exposes the
registered `page`, `project`, `post`, and `release` content types with create,
edit, delete, search, filters, pagination, bulk actions, drafts, review,
scheduled and published states, revisions, restore, taxonomy, comments, menus,
media fields, and JSON/CSV import and export.

## Add A Content Type

```python
from flaxon.admin.cms import CMSField, ContentType

cms.register(ContentType(
    "guide",
    label="Guide",
    fields=[
        CMSField("title", required=True),
        CMSField("body", type="richtext"),
        CMSField("status", type="select", choices=["draft", "published"]),
    ],
    list_display=["title", "status", "updated_at"],
    list_filter=["status"],
    search_fields=["title", "body"],
))
```

CMS mutations include CSRF tokens and are permission-aware. Store content in
the configured database and run the migration before the first deployment.
