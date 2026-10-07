# Full Admin and CMS Example

This is an editable local showcase for the model admin and CMS SPA. It uses a
persistent SQLite JSON store under `data/`, seeds posts, pages, taxonomies,
comments, and a menu, and exposes representative admin model actions.

From this directory:

```bash
python -m flaxon run app:app --reload --port 8000
```

Open <http://127.0.0.1:8000/admin/login> and sign in with `admin` / `admin`.
The editor account is `editor` / `editor`. This is development-only sample
credentials; replace them before deployment.
