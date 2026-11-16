# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Biome lint and format check (`npm run lint`) in CI
- `npm run validate`: manifests against the Agent Plugins schemas, the OpenAI OAuth block against OpenAI's documented fields, and skill frontmatter

## [0.2.0] - 2026-11-15

### Added

- `x-search` skill for posts, X news, profiles, and trends

### Changed

- `x-bookmarks` skill now warns about per-post cost and asks before reading more than ~100 bookmarks
- README documents real-world cost (about half a cent per post returned) and verified news search

## [0.1.1] - 2026-11-15

### Added

- GitHub Actions CI (typecheck, template guard, OAuth discovery)
- `npm run configure` / `check:template` for fork-friendly setup
- Portable ChatGPT plugin package (`plugins/x-bookmarks`) talking directly to `https://api.x.com/mcp?read_only=true`
- Repo marketplace entry (`.agents/plugins/marketplace.json`)
- Bookmarks skill with explicit confirmation for destructive actions
- Local TypeScript verify script (`npm run verify`)
- Desktop `xurl` stdio fallback config
- Plugin logo assets for ChatGPT ZIP uploads

### Documented

- ChatGPT Plus web + iOS PoC success
- OAuth callback exact-match gotcha
- Scope vs discovered-tools distinction
- DIY fork quickstart (bring your own X app)

## [0.1.0] - 2026-11-15

### Added

- Initial repository scaffold (LICENSE, README)
