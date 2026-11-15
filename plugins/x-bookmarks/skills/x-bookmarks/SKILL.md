---
name: x-bookmarks
description: List and search the user's personal X (Twitter) bookmarks via X's hosted MCP. Use when the user asks about their bookmarks, saved posts, or bookmark folders.
---

# X Bookmarks

Use the `x` MCP server connected to `https://api.x.com/mcp` (prefer `?read_only=true`).

## Confirmed read tools

These names match X's official hosted MCP surface:

| Goal | Tool |
|------|------|
| Resolve the signed-in account | `get_users_me` |
| List bookmarks | `get_users_bookmarks` |
| List bookmark folders | `get_users_bookmark_folders` |
| List bookmarks in a folder | `get_users_bookmarks_by_folder_id` |

If `tools/list` shows different names, prefer the live names and treat this table as a fallback.

## Workflow: list or search bookmarks

1. Call `get_users_me` once and keep the returned user `id` (required by bookmark tools).
2. Call `get_users_bookmarks` with `{ "id": "<that user id>" }`. Paginate with whatever cursor / next-token field the tool returns until you have enough results or the user asks to stop.
3. If the user names a folder, call `get_users_bookmark_folders`, match the folder, then `get_users_bookmarks_by_folder_id` with the same user `id` plus the folder id.
4. Filter or search client-side by text, author handle, date, or topic. The hosted MCP does not expose a dedicated bookmark search tool.
5. Summarize with short excerpts and `https://x.com/.../status/{id}` links. Do not dump raw JSON unless the user asks for it.

Do not call `get_users_bookmarks` without `id` — the server returns `Invalid Request` for `:id`.

## Confirmation rule (required)

Never call a tool that adds, removes, or moves bookmarks; creates or publishes Articles; posts, likes, follows, DMs, or otherwise changes state on X unless:

1. You restate the exact action and target in plain language, and
2. The user replies with an explicit yes / confirm / go ahead for that action.

With `?read_only=true`, write tools should not appear. If a write tool still appears, still require confirmation before calling it.

## Out of scope

- Direct messages / XChat (not exposed by the hosted X MCP; encrypted chats need local keys).
- Posting, liking, following, or other social actions.
- App-only Bearer tokens (no user context → no personal bookmarks).

## Cost note

Each tool call hits the X API under the user's pay-per-use credits. Prefer one paginated bookmarks fetch over many tiny calls.
