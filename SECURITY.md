# Security Policy

## Supported versions

Security fixes are considered for the current `main` branch. MemeDrop is a static browser application that relies on public third-party meme and image services, so reports involving remote content handling, canvas export, browser storage, or client-side sharing are especially useful.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for a suspected vulnerability. Use the repository’s private vulnerability-reporting channel instead:

https://github.com/vincenzo-afk/MemeDrop/security/advisories/new

Include a concise description, reproduction steps, affected browser or environment details, and any safe proof of concept. Do not include credentials, private user data, or destructive payloads. The maintainer will assess the report through GitHub’s private advisory workflow; no response-time commitment is made in this policy.

## Security boundaries

MemeDrop stores gallery entries, tags, and theme preferences in the browser’s `localStorage`. It has no account system, backend database, or private application API. Users should treat loaded third-party images and public share URLs as external content.
