# Contributing

Thanks for helping improve this DIY ChatGPT ↔ X MCP template.

## Development

```bash
cp .env.example .env.local   # add your OAuth 2.0 CLIENT_ID / CLIENT_SECRET
npm install
npm run configure            # local only — do not commit patched Client IDs
npm run ci                   # everything CI runs: lint, typecheck, template guard, manifest validation, OAuth discovery
npm run lint:fix             # auto-fix formatting and lint issues (Biome)
```

`npm run validate` checks `plugin.json` and `mcp.json` against the published Agent Plugins schemas, the OpenAI OAuth block against OpenAI's documented fields, and every `skills/*/SKILL.md` for valid frontmatter whose `name` matches its folder.

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
