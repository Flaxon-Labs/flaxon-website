# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ⚠️ Alpha - No guarantees |
| 1.0.x   | ✅ Full support    |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. Email me at **aldanehutchinson5@gmail.com**
3. Provide as much information as possible:
   - Framework version
   - Python version
   - Step-by-step reproduction
   - Potential impact
   - Suggested fix (if any)

We will acknowledge your report within 48 hours and will work to resolve it as quickly as possible.

## Security Best Practices

### Production Deployment

- **Never** enable `debug=True` in production
- Use a strong `SECRET_KEY` (32+ random bytes)
- Set `ALLOWED_HOSTS` to your domain(s)
- Terminate TLS at your reverse proxy or load balancer
- Use environment variables for secrets
- Keep dependencies updated

### Environment Variables

```env
# Production example
FLAXON_ENV=production
FLAXON_DEBUG=false
FLAXON_SECRET_KEY=<32+ random hex bytes>
FLAXON_ALLOWED_HOSTS=api.example.com,example.com


Built-in Security Features
Autoescaping in Jinax templates

Request validation with declarative schemas

Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

Request IDs for tracing

Sensitive data redaction in debug mode

Rate limiting (single-process, configurable)

Production-safe error responses (no traceback leakage)

Vulnerability Disclosure Process
Report received and acknowledged

We investigate and validate the vulnerability

We develop a fix

We release a patch version

We credit the reporter (if desired)

Responsible Disclosure
We believe in responsible disclosure. Please give us reasonable time to fix the issue before sharing details publicly.

Contact
Security: security@flaxon.dev

General: maintainers@flaxon.dev

Thank you for helping keep Flaxon and its users safe! 🔒