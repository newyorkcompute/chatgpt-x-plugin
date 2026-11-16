---
name: x-search
description: Search X (Twitter) for posts, news stories, people, and what a specific account has posted via X's hosted MCP. Use when the user asks what people are saying on X, for news or trends on X, or what someone posted. For the user's own bookmarks, use the x-bookmarks skill instead.
---

# X Search

Use the `x` MCP server connected to `https://api.x.com/mcp` (prefer `?read_only=true`).

## Confirmed read tools

| Goal | Tool |
|------|------|
| Search posts | `search_posts_all` |
| Count matching posts (last 7 days) | `get_posts_counts_recent` |
| Search X news stories | `search_news` |
| Read one news story | `get_news` |
| Trending topics for a location (WOEID, e.g. `1` worldwide, `23424977` US) | `get_trends_by_woeid` |
| Find people | `search_users` |
| Look up a profile by handle | `get_users_by_username` |
| A user's recent posts | `get_users_posts` (needs the numeric user `id`) |
| Read posts by id | `get_posts_by_id` / `get_posts_by_ids` |
| Quote posts of a post | `get_posts_quoted_posts` |

If `tools/list` shows different names, prefer the live names and treat this table as a fallback.

## Workflows

- **"What are people saying about X?"** — `search_posts_all` with a focused query (X search operators such as `lang:en -is:retweet` help). Use a recent `start_time` for current topics. Summarize the main viewpoints, then cite 3–5 representative posts with links.
- **News** — `search_news` first; it returns curated stories. Fall back to `search_posts_all` for reactions.
- **"What has @handle posted?"** — `get_users_by_username` to get the `id`, then `get_users_posts` with that `id`.
- **Trends** — `get_trends_by_woeid`; ask for a location only if the user implies one.

Link posts as `https://x.com/{username}/status/{id}` (or use the `url` field the tool returns). Do not dump raw JSON unless asked.

If a search returns nothing useful, say so and suggest a broader query or longer time range instead of guessing. If a handle doesn't resolve, ask the user to check it.

## Accuracy

Report only posts, stories, and profiles the tools returned. Never invent or fill in post text, handles, dates, metrics, or links. When you summarize opinions, base them on the posts you actually read and say roughly how many that was.

## Priority

Explicit user instructions override this skill's defaults — result counts, time ranges, and output format. The confirmation rule below still applies to anything that changes state on X.

## Cost

Each post returned is billed to the user's X API pay-per-use credits (about half a cent per post at the time of writing). Request only as many results as the answer needs — usually 10–25 — and do not paginate further unless the user asks. `get_usage_credits` returns the remaining balance if the user asks about cost.

## Confirmation rule (required)

Never post, reply, like, repost, follow, or otherwise change state on X unless you restate the exact action and the user explicitly confirms it. With `?read_only=true`, write tools should not appear.

## Out of scope

- Direct messages / XChat contents (end-to-end encrypted; not readable without local keys).
- Likes, lists, and followers unless the user granted those OAuth scopes.
