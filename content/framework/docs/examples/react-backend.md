# React frontend and API

This is a complete, runnable example: a Flaxon JSON API paired with a Vite and
React frontend. The source of truth is kept together in
[`docs/examples/react_backend`](react_backend/README.md), rather than copied
into this page.

## Run it

From the repository root, start the backend:

```bash
cd docs/examples/react_backend
flaxon run app:app --reload
```

In a second terminal, start the React development server:

```bash
cd docs/examples/react_backend/frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. The React app
uses the API at `http://127.0.0.1:8000`, and the backend deliberately allows
only the Vite development origin through CORS.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/products` | List products |
| `GET` | `/api/products/<int:product_id>` | Fetch one product |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/<int:product_id>` | Replace a product |
| `DELETE` | `/api/products/<int:product_id>` | Delete a product |

`POST` and `PUT` accept JSON with a non-empty `name` and a non-negative
`price`. The frontend shows listing, creation, and deletion; the update route
is available for an edit form.

## Before production

The example intentionally stores data in a Python list so it can be read in a
few minutes. Replace it with a database and repository/service layer, use the
real deployed frontend origin in CORS, and add authentication and pagination
before shipping an application.
