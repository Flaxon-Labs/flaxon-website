# Support

Welcome to Flaxon! This document explains where developers can get help,
report issues, and contribute to the project.

## Documentation

Start with the official Flaxon documentation:

- [Quick Start Guide](https://flaxon.dev/quickstart)
- [API Reference](https://flaxon.dev/api)
- [Guides](https://flaxon.dev/guides)
- [Examples](https://github.com/aldanedev-create/Flaxon-Backend-Framework/tree/main/examples)

For the latest source code, releases, documentation, and development
information, visit the
[Flaxon GitHub repository](https://github.com/aldanedev-create/Flaxon-Backend-Framework).

## Community and Development

### GitHub

The GitHub repository is the primary location for project development.

- **Issues** — [Report bugs and technical problems](https://github.com/aldanedev-create/Flaxon-Backend-Framework/issues)
- **Discussions** — [Ask questions and discuss ideas](https://github.com/aldanedev-create/Flaxon-Backend-Framework/discussions)
- **Pull Requests** — [Submit code and documentation contributions](https://github.com/aldanedev-create/Flaxon-Backend-Framework/pulls)

## When to Use Each Channel

| Issue Type | Best Channel |
|------------|--------------|
| Bug report | GitHub Issues |
| Feature request | GitHub Discussions |
| General question | GitHub Discussions |
| Documentation issue | GitHub Issues |
| Code contribution | Pull Request |
| Security vulnerability | `SECURITY.md` |
| Plugin issue | GitHub Issues |
| Plugin contribution | Pull Request |

## Current Project Status

Flaxon 2.0 is the current major development version.

The **core framework API is largely stable** and the project has an established
plugin architecture.

Ongoing development focuses on:

- Bug fixes and maintenance
- Plugin stabilization
- Compatibility testing
- Security improvements
- Performance testing
- Documentation
- Developer tooling
- Example applications
- Ecosystem development

Individual plugins may have different levels of maturity and may require
additional testing before being used in critical production systems.

For important applications, users should test the specific Flaxon version
and plugins they intend to deploy.

## How Is Flaxon Different from Flask?

Flaxon is designed as an **async-first Python backend framework built around
ASGI**.

It provides Flask-style routing and application development while providing
built-in support for asynchronous applications, WebSockets, middleware,
validation, testing, debugging, and extensibility.

## How Is Flaxon Different from Django?

Flaxon is designed to be **technology-neutral**.

It does not require developers to use a particular:

- Database
- ORM
- Frontend framework
- Authentication system
- Template engine

Developers can select the technologies appropriate for their application
while using Flaxon for the backend application layer.

## Do I Need to Use Jinax?

No.

Jinax is optional. Flaxon can be used as a pure JSON/API framework without
using a template engine.

## What Databases Are Supported?

Flaxon does not require a specific ORM or database system.

Developers can integrate Flaxon with technologies such as:

- SQLAlchemy
- SQLModel
- Tortoise ORM
- asyncpg
- Motor
- Other Python database libraries

The goal is to keep the framework independent of a single database technology.

## Plugins

Flaxon's core includes an extensible plugin architecture.

Plugins can provide additional functionality without requiring the core
framework to contain every possible integration.

The plugin ecosystem is actively being developed and stabilized. Plugin
documentation and testing are therefore an ongoing area of development.

## Security

Security vulnerabilities should **not** be reported through public GitHub
issues.

Please follow the instructions in
[`SECURITY.md`](SECURITY.md) for responsible vulnerability reporting.

## Contributing

Flaxon is an open-source project and welcomes contributions to:

- Core framework development
- Plugins
- Documentation
- Tests
- Examples
- Developer tooling
- Bug fixes
- Performance improvements

Before contributing, please read the
[Contributing Guide](CONTRIBUTING.md).

## Commercial Support

Commercial support, consulting, or enterprise services may be available in
the future.

For project-related support, please use the public GitHub project channels
described above.

---

Flaxon is built in the open, and contributions, feedback, bug reports, and
documentation improvements are welcome.

Thank you for helping improve Flaxon. 💙
