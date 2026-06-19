# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |
| < 0.2   | No        |

## Reporting a Vulnerability

Please report security vulnerabilities via [GitHub Security Advisories](https://github.com/simhanson123/signal-lens/security/advisories/new) rather than public issues.

We aim to respond within 72 hours.

## Security Model

See [docs/security.md](docs/security.md) for the full security design including:

- Read-only default GitHub token permissions
- Fork PR secret handling
- Untrusted input treatment (PR body, issue body, commit messages)
- Human-in-the-loop for all write operations
- MCP tool trust boundaries