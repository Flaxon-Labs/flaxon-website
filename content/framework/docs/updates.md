# Flaxon Update Policy

This document explains how updates are managed for the Flaxon framework and its official plugins.

---

# Overview

Flaxon follows a predictable release cycle to ensure stability while delivering new features and improvements.

Updates may include:

- New features
- Performance improvements
- Bug fixes
- Security patches
- Documentation updates
- New plugins
- CLI improvements
- Developer experience enhancements

---

# Release Channels

## Stable

Recommended for production.

```text
pip install flaxon
```

Characteristics:

- Fully tested
- Production ready
- Backwards compatible
- Security reviewed

---

## Pre-release

For testing upcoming features.

```text
pip install --pre flaxon
```

May include:

- Beta releases
- Release candidates
- Experimental APIs

Not recommended for production.

---

## Development

Built directly from GitHub.

```bash
git clone https://github.com/aldanedev-create/Flaxon-Backend-Framework

cd Flaxon-Backend-Framework

pip install -e .
```

May contain:

- Incomplete features
- API changes
- Experimental functionality

---

# Semantic Versioning

Flaxon follows Semantic Versioning (SemVer).

```
MAJOR.MINOR.PATCH
```

Example:

```
1.0.0
1.2.0
1.2.5
2.0.0
```

---

## Patch Releases

Example:

```
1.3.4 → 1.3.5
```

Includes:

- Bug fixes
- Documentation updates
- Performance improvements
- Security fixes
- Internal optimizations

No breaking changes.

---

## Minor Releases

Example:

```
1.3.0 → 1.4.0
```

Includes:

- New features
- New APIs
- New middleware
- New decorators
- CLI improvements
- Additional plugins

Backwards compatible.

---

## Major Releases

Example:

```
1.x.x → 2.0.0
```

Includes:

- Breaking API changes
- Removed deprecated features
- Large architecture improvements
- Major performance upgrades

Migration guides will be provided.

---

# Update Schedule

| Release Type | Typical Frequency |
|--------------|-------------------|
| Patch | As needed |
| Minor | Every 1–3 months |
| Major | When significant breaking changes are required |
| Security | Immediately |

---

# Updating Flaxon

Upgrade to the latest stable release:

```bash
pip install --upgrade flaxon
```

Upgrade standard extras:

```bash
pip install --upgrade "flaxon[standard]"
```

Upgrade all installed packages:

```bash
pip list --outdated
pip install --upgrade -r requirements.txt
```

---

# Updating Official Plugins

Update a specific plugin:

```bash
pip install --upgrade flaxon-ai
```

```bash
pip install --upgrade flaxon-mobile
```

```bash
pip install --upgrade flaxon-inertia
```

```bash
pip install --upgrade flaxon-fyr
```

```bash
pip install --upgrade flaxon-debug-toolbar
```

```bash
pip install --upgrade flaxon-sentry
```

```bash
pip install --upgrade flaxon-pytest
```

```bash
pip install --upgrade flaxon-spring-boot
```

```bash
pip install --upgrade flaxon-ffd
```

---

# Checking Installed Version

CLI:

```bash
flaxon --version
```

Python:

```python
import flaxon

print(flaxon.__version__)
```

---

# Compatibility Policy

Official plugins aim to remain compatible with the current stable release of Flaxon.

Example:

| Plugin Version | Flaxon Version |
|----------------|----------------|
| 1.2.x | 1.2.x |
| 1.3.x | 1.3.x |
| 2.0.x | 2.x |

---

# Deprecation Policy

Features are not removed immediately.

The process is:

1. Mark as deprecated.
2. Emit a warning.
3. Document the replacement.
4. Remove in the next major release.

Example:

```
v1.8
│
├── Deprecated
│
v1.9
│
├── Still supported
│
v2.0
│
└── Removed
```

---

# Security Updates

Critical security issues receive immediate patch releases.

Security releases may include:

- Authentication fixes
- Authorization fixes
- Dependency updates
- Template security improvements
- Request validation fixes
- WebSocket security patches

Users should install security updates as soon as possible.

---

# Breaking Changes

Major releases may include breaking changes.

Every major release includes:

- Migration Guide
- Upgrade Notes
- Deprecated APIs
- Replacement APIs
- Updated examples

---

# Documentation Updates

Documentation is updated alongside every release.

This includes:

- API Reference
- Tutorials
- Examples
- CLI Documentation
- Plugin Documentation

---

# Changelog

Every release is documented in:

```
CHANGELOG.md
```

Each release includes:

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

Example:

```markdown
## [1.4.0] - 2026-08-03

### Added

- GraphQL subscriptions
- New validation fields

### Changed

- Faster route matching

### Fixed

- WebSocket reconnect bug

### Security

- Improved JWT validation
```

---

# Upgrade Checklist

Before upgrading:

- Back up your project.
- Read the release notes.
- Review the migration guide (if applicable).
- Update dependencies.
- Run your test suite.
- Verify plugin compatibility.

---

# Reporting Update Issues

If an update introduces unexpected behavior:

1. Verify the installed version.
2. Review the release notes.
3. Check the migration guide.
4. Search existing GitHub issues.
5. Open a new issue with:
   - Flaxon version
   - Python version
   - Operating system
   - Error message
   - Minimal reproducible example

---

# Long-Term Support (LTS)

LTS releases receive:

- Security updates
- Critical bug fixes
- Stability improvements

They do not receive new features.

---

# Update Philosophy

Every Flaxon update should strive to be:

- Stable
- Predictable
- Well documented
- Backwards compatible where possible
- Fast
- Secure
- Easy to upgrade
- Production ready

Our goal is to make upgrading Flaxon a smooth and reliable experience with minimal disruption to existing applications.