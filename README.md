# chatgpt-x-plugin

[![CI](https://github.com/newyorkcompute/chatgpt-x-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/newyorkcompute/chatgpt-x-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <img src="docs/assets/hero.jpg" alt="OpenAI + X" width="720" />
</p>

Fork-friendly ChatGPT plugin that talks **directly** to X’s hosted MCP:

`https://api.x.com/mcp?read_only=true`

No custom proxy server. Each person uses **their own** X developer app + ChatGPT OAuth. Verified on **ChatGPT Plus** (web + iOS).

**Docs:** [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

> Community project — not affiliated with or endorsed by X Corp. or OpenAI. X and ChatGPT are trademarks of their respective owners.

## Why this is different

Most ways of getting X into ChatGPT put something in the middle:

| Approach | Examples | Trade-off |
|----------|----------|-----------|
| Hosted middleman | AnythingMCP, Composio, Tweetsmash | Your X login and data pass through a third party |
| Local bridge | X's own `xurl mcp` | stdio only — no ChatGPT web or iPhone |
| Self-hosted + tunnel | x-signal, x-mcp-server | Run Docker or a server, plus OpenAI's Secure MCP Tunnel |
| Desktop app | SomedayX | ChatGPT for Mac only |

This repo connects ChatGPT **straight to X's official MCP** with a normal *Sign in with X*. Nothing to host, and it works on ChatGPT web and iPhone.

[X's MCP docs](https://docs.x.com/tools/mcp) say `api.x.com/mcp` doesn't advertise MCP OAuth discovery and recommend the `xurl` bridge. As of November 2026 it does advertise it — `npm run verify:discovery` checks the live metadata. The one real gap is that X has no dynamic client registration, so you register your own X app and give ChatGPT its Client ID and Secret. The steps below walk through it.

## Quick start (your own install)

1. **Clone / fork** this repo.
2. Create an X app at [console.x.com](https://console.x.com):
   - Package: **Pay-per-use**, environment: **Production**
   - OAuth 2.0: **Web App** (confidential), permissions: **Read**
   - Callback: `http://localhost:8080/callback` (add ChatGPT’s callback later)
3. Copy credentials locally:

```bash
cp .env.example .env.local
# set CLIENT_ID + CLIENT_SECRET (OAuth 2.0 — not Consumer Key / Bearer)
npm install
npm run configure    # writes CLIENT_ID into plugins/x-bookmarks/mcp.json
```

4. In ChatGPT **web**: [Plugins](https://chatgpt.com/plugins) → **+** → **Add custom MCP server**
   - URL: `https://api.x.com/mcp?read_only=true`
   - Auth: OAuth → **User-defined client** → `client_secret_basic`
   - Client ID / Secret from `.env.local`
   - Scopes: `tweet.read` `users.read` `bookmark.read` `offline.access`
   - Register the **exact** Callback URL ChatGPT shows on your X app, then finish OAuth
5. Install the plugin → ask: *List my latest X bookmarks*
6. Optional: add the skills, name, and icon with `npm run package` — see [Adding the skills, name, and icon](#adding-the-skills-name-and-icon-to-your-chatgpt-plugin)

**Cost:** ChatGPT plan + your own X API pay-per-use credits. Friends using this guide burn **their** credits, not yours.

**Do not commit** `.env.local` or a patched `CLIENT_ID` in `mcp.json`. Restore placeholders before pushing:

```bash
git checkout -- plugins/x-bookmarks/mcp.json plugins/x-bookmarks/mcp.xurl.fallback.json
```

## What you get (read-only)

With `?read_only=true`, X advertises ~59 read tools. What actually works depends on your OAuth scopes.

| Capability | Notes |
|------------|--------|
| **Bookmarks** | Needs `bookmark.read` — verified |
| **Search posts + X news** | `tweet.read` + `users.read` — verified |
| **Profiles, a user’s posts, trends** | Same scopes; expected to work |
| **Likes, Lists, Spaces, …** | Need matching scopes (e.g. `like.read`) + re-auth |
| **X Chat** | Tools exist; message bodies are E2E encrypted without local keys |

Bundled skills guide ChatGPT: [`x-bookmarks`](plugins/x-bookmarks/skills/x-bookmarks/SKILL.md), [`x-search`](plugins/x-bookmarks/skills/x-search/SKILL.md), and the onboarding skill [`x-setup`](plugins/x-bookmarks/skills/x-setup/SKILL.md), which runs after install to check the connection and explain cost. X’s MCP renders post and news cards in ChatGPT on its own.

**Cost in practice:** X bills about **half a cent per post returned**. A search is a few cents; reading 300 bookmarks is about $1.50. The skills keep result counts small and ask before large scans.

## Architecture

| Path | How it works |
|------|----------------|
| **Preferred** | ChatGPT → `api.x.com/mcp` over streamable HTTP with your X app as a **provided** OAuth client |
| **Desktop fallback** | [`mcp.xurl.fallback.json`](plugins/x-bookmarks/mcp.xurl.fallback.json) runs `npx @xdevplatform/xurl mcp …` (stdio). Still not a hosted proxy |

X does **not** support DCR/CIMD for this MCP. ChatGPT cannot invent a client — you must supply Client ID + Secret. ChatGPT uses a per-connection redirect:

`https://chatgpt.com/connector/oauth/{callback_id}`

A one-character mismatch → X’s “You weren’t able to give access to the App” screen.

```text
ChatGPT  --OAuth PKCE (your X app)-->  x.com authorize + api.x.com token
ChatGPT  --Bearer + streamable-http-->  api.x.com/mcp?read_only=true
```

## Repo layout

```text
.agents/plugins/marketplace.json
plugins/x-bookmarks/
  plugin.json
  mcp.json                 # template — run npm run configure
  mcp.xurl.fallback.json   # optional desktop stdio bridge
  assets/                  # logo + composer icon for ZIP uploads
  skills/
    x-bookmarks/           # list, search, and page through bookmarks
    x-search/              # posts, news, profiles, trends
    x-setup/               # onboarding: checks the connection, credits, and cost
scripts/
  configure.ts             # writes your Client ID into the manifests
  package.ts               # builds the ChatGPT upload ZIP
  verify.ts                # OAuth discovery + live MCP check
  check-template.ts        # CI guard: manifests keep placeholders
  validate-manifests.ts    # CI: manifest schemas + skill frontmatter
```

## Local verify

```bash
npm run verify:discovery
```

Full tools + bookmarks (needs user token):

```bash
# brew install --cask xdevplatform/tap/xurl   # or npm i -g @xdevplatform/xurl
xurl auth apps add chatgpt-x --client-id "$CLIENT_ID" --client-secret "$CLIENT_SECRET"
xurl auth oauth2 --app chatgpt-x
X_TOKEN=$(xurl token) npm run verify
```

`get_users_bookmarks` requires `{ "id": "<user id>" }` from `get_users_me` first.

## ChatGPT surfaces

| Surface | Create custom MCP | Use plugin |
|---------|-------------------|------------|
| **Web** | Yes (Plus verified) | Yes |
| **iOS** | No (create on web) | Yes — same personal plugin |
| **Desktop** | Via web or marketplace | Likely yes |

### GitHub / desktop marketplace

```bash
codex plugin marketplace add newyorkcompute/chatgpt-x-plugin
```

Or add the GitHub URL in ChatGPT desktop. Plugins with `mcp.json` may show as **Desktop only**; web/iOS users should use **Add custom MCP server** as above.

To pick up a new version on desktop, run `codex plugin marketplace upgrade` and restart the ChatGPT desktop app.

To limit which X tools Codex may call (for example, bookmarks only), add this to `~/.codex/config.toml`:

```toml
[plugins."x-bookmarks".mcp_servers.x]
enabled_tools = ["get_users_me", "get_users_bookmarks", "get_users_bookmark_folders", "get_users_bookmarks_by_folder_id"]
```

### Adding the skills, name, and icon to your ChatGPT plugin

A plugin created with **Add custom MCP server** starts with just the connection. To add this repo's skills, display name, starter prompts, and icon — and to update them later — upload a ZIP built from the repo:

1. ChatGPT → **Plugins** → your plugin → `...` → **Download plugin ZIP**
2. Build the upload ZIP:

   ```bash
   npm run package -- ~/Downloads/plugin.zip
   ```

   This keeps ChatGPT's connection file and internal plugin name from the download, takes everything else from [`plugins/x-bookmarks/`](plugins/x-bookmarks/), and bumps the patch version. Pass `--version 1.2.3` to pick a version yourself.
3. `...` → **Upload new version** → `dist/x-for-chatgpt-v<version>.zip`

Pushing to GitHub doesn't update ChatGPT — repeat these steps after you change a skill, the description, or an icon.

The included icon resembles X’s logo — fine for personal use; for a **public** directory listing, use an original icon (trademark).

## Sharing with friends

| Goal | Approach |
|------|----------|
| They run **their own** plugin | Send this README — each creates an X app + custom MCP (this repo) |
| One-click install on **your** plugin | Publish to ChatGPT directory / workspace with **your** X app as the OAuth client — then **you** pay X API usage for everyone |

There is no way to share a personal plugin install so others use it without publishing or re-setup.

## Validation log (maintainer PoC)

| Check | Status |
|-------|--------|
| OAuth discovery (S256, no DCR) | Pass |
| Local `get_users_bookmarks` via MCP | Pass |
| ChatGPT Plus custom MCP (web) | Pass |
| Bookmarks + search in ChatGPT | Pass |
| X news search in ChatGPT | Pass |
| ChatGPT iOS (web-created plugin) | Pass |
| Desktop marketplace install | Pending |

## Safety

- Prefer `?read_only=true` so X omits write tools.
- Skill requires explicit confirmation before any state-changing action.
- Never commit `.env.local`, client secrets, or `~/.xurl`.

## References

- [OpenAI: Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [OpenAI: Authentication](https://developers.openai.com/plugins/build/auth)
- [OpenAI: Custom MCP servers](https://help.openai.com/en/articles/12584461)
- [X MCP docs](https://docs.x.com/tools/mcp)
- [xdevplatform/xurl](https://github.com/xdevplatform/xurl)

## License

MIT — see [LICENSE](LICENSE).

