# Flaxon GraphQL GitHub Clone

This is a small production-shaped GraphQL API for testing Flaxon locally. It
models users and repositories, supports nested owner data, repository search,
repository creation, starring, GraphiQL, and Altair.

The data store is intentionally in memory so the example is easy to run. Use a
database adapter before deploying it.

## Editable setup

From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e .
flaxon run examples.graphql_github_clone.app:app --reload
```

Open:

- API: `http://127.0.0.1:8000/graphql`
- GraphiQL: `http://127.0.0.1:8000/graphql/graphiql`
- Altair: `http://127.0.0.1:8000/graphql/altair`

## Query

```graphql
query Repositories($search: String) {
  viewer { login name }
  repositories(search: $search) {
    id
    name
    description
    stars
    owner { login }
  }
}
```

Variables:

```json
{"search": "flaxon"}
```

## Mutations

```graphql
mutation Create {
  createRepository(name: "demo", description: "A Flaxon example") {
    id
    name
    stars
  }
}
```

```graphql
mutation Star {
  starRepository(id: 1) { id name stars }
}
```

The editable install makes imports resolve to the checked-out Flaxon source, so
framework changes can be tested immediately while this example is running.
