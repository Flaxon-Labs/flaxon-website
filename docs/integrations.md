# Integrations

## GitHub

The website exposes read-only GitHub organization data through the configured
organization name. Set `GITHUB_ORG` to the organization slug. Public
repositories work without a token; set `GITHUB_TOKEN` for higher API limits or
private repository access. Tokens stay in environment variables and are never
returned to clients.

```env
GITHUB_ORG=Flaxon-Labs
GITHUB_TOKEN=github_pat_your_token
```

The API endpoints are `/api/github/projects` and
`/api/github/releases/<repository>`. Both use bounded timeouts and return
`503` when GitHub is unavailable so the public site does not fail open or hang.
