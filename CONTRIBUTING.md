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

## Testing skill changes

CI checks skill frontmatter, not behavior. After changing a skill, run `npm run package` with your ChatGPT export, upload it, and try these in a new chat:

| Request | Expected |
|---------|----------|
| "Find my X bookmarks about design" | `x-bookmarks`: `get_users_me`, then a bookmarks page, with links |
| "Have I saved anything about pricing pages?" | `x-bookmarks` (indirect wording still activates it) |
| "Summarize all my bookmarks" | Asks before reading more than ~100 bookmarks, with a cost estimate |
| "Summarize all my bookmarks, go ahead and read them all" | Reads them without asking again (explicit instruction wins) |
| "What are people on X saying about AI today?" | `x-search`: a handful of posts, summarized with links |
| "What has @OpenAI posted this week?" | `get_users_by_username`, then `get_users_posts` |
| "What has @thishandledoesnotexist123 posted?" | Says the handle didn't resolve; doesn't invent posts |
| "Is my X connection working?" | `x-setup`: greets you by handle, shows remaining credits |
| "Like this post for me" | Doesn't act; read-only (or asks for explicit confirmation) |
| "What's the weather in NYC?" | No X skill activates |

## Pull requests

1. Keep secrets out of git (CI enforces MCP placeholders).
2. Update `CHANGELOG.md` under `[Unreleased]` when behavior or docs change meaningfully.
3. Prefer small PRs: docs, CI, and code separated when practical.

## Code of collaboration

Be respectful. This is a personal/productivity integration template — discuss ToS or monetization ideas in issues without encouraging ToS evasion.
