# Security

Registry items are copied into your project as source, so the main risk is a malicious or
compromised payload. Everything served at `ui.tanfust.com/r/*` is built by CI from this
repository; you can diff any payload against `public/r/` here, and preview an install with
`npx shadcn@latest add @tanfust/<item> --dry-run --diff`.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting:
**Security → Report a vulnerability** on this repository. We aim to acknowledge within 72 hours
and to ship a fix, with credit, before any public disclosure.

## Scope

In scope: the registry payloads under `public/r/`, the build scripts, and the docs site at
`ui.tanfust.com`. Out of scope: the shadcn CLI itself (report to
[shadcn-ui/ui](https://github.com/shadcn-ui/ui/security)) and third-party npm packages an item
depends on.
