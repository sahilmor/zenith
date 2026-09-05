# Security Policy

## Supported Versions

Zenith is developed on a single `main` branch with no separate maintained release lines. Security fixes are applied to `main` and deployed to production as soon as they are available; there is no support for older tags or branches.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, use GitHub's private vulnerability reporting for this repository:
https://github.com/sahilmor/zenith/security/advisories/new

When reporting, please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof-of-concept if available
- The affected component (e.g. auth API, billing, AI copilot, sockets) and any relevant commit/version

You can expect an initial acknowledgement within a few days. Once a reported vulnerability is confirmed, a fix will be prioritized and a coordinated disclosure timeline will be agreed with the reporter before any public details are shared.

## Scope

This policy covers the code in this repository (`apps/`, `packages/`, `docker/`). Vulnerabilities in third-party dependencies should generally be reported upstream, though you are welcome to flag them here as well so they can be tracked and patched.
