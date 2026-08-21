# Contributing to MemeDrop

Thank you for helping improve MemeDrop. This repository is a static browser application, so contributions should preserve the existing no-build setup unless the change explicitly introduces a documented toolchain.

## Before opening a pull request

Discuss substantive changes in an issue first when practical. For small documentation, styling, or focused bug fixes, a pull request may be opened directly.

| Step | Requirement |
|---|---|
| Branch | Use a descriptive name such as `feat/story-caption`, `fix/gif-redraw`, or `docs/readme` |
| Scope | Keep each pull request focused on one user-visible change or maintenance concern |
| Validation | Run `node --check script.js` and manually exercise the changed browser flow |
| Documentation | Update the README or `docs/` when behavior, data sources, setup, or limitations change |
| Commits | Prefer a clear conventional prefix such as `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, or `chore:` |

## Local development

```bash
git clone https://github.com/vincenzo-afk/MemeDrop.git
cd MemeDrop
python3 -m http.server 8080
```

Open `http://localhost:8080` and validate the interface in a current browser. The application depends on public remote services for feeds and image delivery, so test the relevant loading and fallback states when editing those paths.

## Pull request checklist

Before requesting review, confirm that the pull request describes its purpose, documents user-visible changes, lists validation performed, and calls out breaking, data-source, or security implications. Do not commit credentials, tokens, downloaded personal data, or browser storage exports.

## Code style

Use the project’s existing vanilla JavaScript, HTML, and CSS conventions. Prefer small functions, accessible labels, keyboard support for interactive controls, and safe DOM insertion for remote content. Avoid introducing a new framework or dependency when a browser API already satisfies the requirement.

## Community standards

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.
