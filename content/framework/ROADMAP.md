# Roadmap

Flaxon's development roadmap and milestone planning.

## Version 2.0 — Core Framework ✅

**Status:** Largely Stable

Flaxon 2.0 represents the current mature state of the core framework.

- ASGI application architecture
- HTTP and WebSocket support
- Lifespan management
- Flask-style routing and decorators
- Typed route parameters
- Request validation
- Middleware system
- CORS
- Request IDs
- Security headers
- Rate limiting
- Jinax template integration
- CLI tooling
- Sync and async testing clients
- Development and production debugging
- Sensitive-data redaction
- Core plugin architecture
- Plugin lifecycle and extension mechanisms
- Developer tooling
- Documentation and examples
- Benchmarking infrastructure

The core API is considered largely stable. Ongoing development focuses primarily on
bug fixes, compatibility, testing, security, performance, and ecosystem development.

## Version 2.x — Ecosystem & Production Maturity 🚧

**Current Development**

- [ ] Stabilize individual official plugins
- [ ] Expand plugin test coverage
- [ ] Improve plugin documentation
- [ ] Improve plugin discovery and distribution
- [ ] Expand ASGI compatibility testing
- [ ] Improve HTTP and WebSocket edge-case handling
- [ ] Expand security testing
- [ ] Improve CI and release automation
- [ ] Expand performance benchmarks
- [ ] Improve deployment documentation
- [ ] Create complete example applications
- [ ] Improve migration and upgrade documentation

## Version 2.x — Official Plugin Ecosystem 🚧

Official and community plugins will provide optional integrations without
increasing the size of the core framework.

Planned ecosystem areas include:

- SQLAlchemy
- Redis
- Authentication
- OAuth
- Storage
- Observability
- Background tasks
- Caching
- Additional database integrations
- Cloud services

Plugin quality, compatibility and test coverage will be treated as separate
release concerns from the core framework.

## Future Development

Potential future capabilities include:

- GraphQL improvements
- gRPC
- Server-Sent Events
- HTTP/3 and QUIC WebSockets
- Real-time collaboration
- OpenAPI tooling
- Code generation
- Additional database adapters
- Additional cloud integrations

## Contribution Wanted!

We welcome contributions to the core framework, plugins, documentation,
testing and developer tooling.

Check our [Contributing Guide](CONTRIBUTING.md) to get started.

---

**Help us build the future of Python backend development.** 🚀
