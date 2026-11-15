# Contributing

Thanks for helping improve this DIY ChatGPT ↔ X MCP template.

## Development

```bash
cp .env.example .env.local   # add your OAuth 2.0 CLIENT_ID / CLIENT_SECRET
npm install
npm run configure            # local only — do not commit patched Client IDs
npm run verify:discovery
npm run check:template
npm run typecheck
```

Optional full MCP check:

```bash
X_TOKEN=$(xurl token) npm run verify
```

## Pull requests

1. Keep secrets out of git (CI enforces MCP placeholders).
2. Update `CHANGELOG.md` under `[Unreleased]` when behavior or docs change meaningfully.
3. Prefer small PRs: docs, CI, and code separated when practical.

## Code of collaboration

Be respectful. This is a personal/productivity integration template — discuss ToS or monetization ideas in issues without encouraging ToS evasion.
