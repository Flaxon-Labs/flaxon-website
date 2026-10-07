# Flaxon ecosystem

Flaxon is deliberately unopinionated about frontends, observability, AI
providers, and deployment topology. The projects below extend the core
framework in those areas. They are published in the
[Flaxon GitHub organization space](https://github.com/aldanedev-create?tab=repositories).

This page is a directory, not a compatibility guarantee. Each project has its
own release cadence, dependencies, license, configuration, and support status.
Read the repository's README and pin compatible versions before adding one to
a production service.

## Application integrations

| Project | What it provides | Use it when |
| --- | --- | --- |
| [flaxon-ai](https://github.com/aldanedev-create/flaxon-ai) | AI/LLM integration for Gemini, OpenAI, and local Flax/JAX models. | Your API needs provider-backed generation or model features. |
| [flaxon-mobile](https://github.com/aldanedev-create/flaxon-mobile) | Android and iOS mobile integration. | You are building a mobile client around a Flaxon backend. |
| [flaxon-fyr](https://github.com/aldanedev-create/flaxon-fyr) | Integration with the Fyr.js reactive frontend. | Fyr.js is the frontend chosen for the application. |
| [flaxon-inertia](https://github.com/aldanedev-create/flaxon-inertia) | Inertia.js integration. | You need Inertia's server-driven frontend model. |
| [flaxon-oauth-google](https://github.com/aldanedev-create/flaxon-oauth-google) | Google OAuth 2.0 authentication integration. | Your application needs Google sign-in. |
| [Flaxon-FFD](https://github.com/aldanedev-create/Flaxon-FFD) | ASGI-level mounting bridge for FastAPI, Flask, and Django applications. | You are migrating incrementally or consolidating existing Python web apps. |
| [flaxon-spring-boot](https://github.com/aldanedev-create/flaxon-spring-boot) | Spring Boot-style patterns, including dependency injection, AOP, and REST controllers. | Your team intentionally wants those architectural conventions. |

## New integrations

The following projects are stable, independently versioned integrations.
Install them from PyPI after their initial release, then read the README and
test them with your application before adoption. They are intentionally
separate from Flaxon core so their dependencies and release cadence remain
independent.

| Project | What it provides |
| --- | --- |
| [flaxon-sqlalchemy](https://github.com/aldanedev-create/flaxon-sqlalchemy) | Async SQLAlchemy engine and session lifecycle integration. |
| [flaxon-stripe](https://github.com/aldanedev-create/flaxon-stripe) | Stripe SDK client configuration and webhook signature verification. |
| [flaxon-s3](https://github.com/aldanedev-create/flaxon-s3) | Amazon S3-compatible object storage access. |
| [flaxon-postsql](https://github.com/aldanedev-create/flaxon-postsql) | Async PostgreSQL connection-pool integration using `asyncpg`. |

## Operations and developer tools

| Project | What it provides | Production note |
| --- | --- | --- |
| [flaxon-sentry](https://github.com/aldanedev-create/flaxon-sentry) | Sentry error-monitoring integration. | Configure data scrubbing, environment names, and alert ownership before deployment. |
| [flaxon-pytest](https://github.com/aldanedev-create/flaxon-pytest) | Pytest fixtures and utilities for Flaxon applications. | Use in development and CI to test routes and integrations. |
| [flaxon-debug-toolbar](https://github.com/aldanedev-create/flaxon-debug-toolbar) | A debug toolbar with Three.js visualizations. | Development only; do not expose diagnostic tooling in production. |
| [Flaxon-vscode](https://github.com/aldanedev-create/Flaxon-vscode) | IDE support for Flaxon. | Install it in developer workstations, not in the server runtime. |

## Companion projects

| Project | Role |
| --- | --- |
| [FlaxonPlusplus](https://github.com/aldanedev-create/FlaxonPlusplus) | Go sidecar project intended for very high-concurrency connection handling. Treat it as a separately deployed service and load-test it with your architecture. |
| [Flaxon-hack-security](https://github.com/aldanedev-create/Flaxon-hack-security) | Security-focused Flaxon plugin project. Review its threat model, source, and dependency posture before adoption; it is not a substitute for the core [security guide](security.md). |

## Choosing safely

1. Start with core Flaxon when it already meets the need.
2. Read the extension's README, license, release notes, and supported Flaxon/Python versions.
3. Add it behind an integration boundary—such as a service module or adapter—so it can be upgraded or replaced.
4. Pin dependencies in your lockfile and test upgrades in CI.
5. For authentication, AI, monitoring, and sidecars, verify secrets handling, network egress, failure behavior, and observability before production.

For building an in-house extension, see [Plugins](guides/plugins.md). For the
core framework's production baseline, see [Deployment](deployment.md) and
[Security](security.md).
