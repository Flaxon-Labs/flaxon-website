# Custom Admin Pages

Flaxon Labs keeps organization-specific operations in `src/flaxon_labs/admin/`
instead of modifying the framework Admin package. Each page is a normal Flaxon
route protected by the Admin session and permission boundary.

```python
async def projects_page(request):
    user = await admin._require_user(request, "admin:read")
    return await request.render("admin/projects.html", {"user": user})

app.router.route("/admin/labs/projects", methods={"GET"}, name="labs_projects")(projects_page)
```

Custom pages should:

- require an explicit permission before reading or mutating data;
- use Jinax templates from the application template directory;
- use the shared Admin CSRF token for every browser mutation;
- write through the configured Neon repository or CMS API;
- record security-sensitive changes in the Admin activity and audit services;
- remain responsive because operators use the Admin from phones and tablets.

The initial website pages are available at `/admin/labs/projects`,
`/admin/labs/documentation`, `/admin/labs/releases`, `/admin/labs/community`,
`/admin/labs/settings`, and `/admin/labs/health`.

Community operators can consume persisted records at
`GET /admin/labs/community/data` and download a JSON snapshot from
`GET /admin/labs/community/export`. Both routes require `admin:read`.
