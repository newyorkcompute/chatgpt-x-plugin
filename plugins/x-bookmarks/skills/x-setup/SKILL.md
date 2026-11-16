---
name: x-setup
description: First-run setup for X for ChatGPT. Confirms the X connection works, shows the remaining X API credit balance, explains per-post cost, and suggests prompts to try. Use right after the plugin is installed or when the user asks whether the X connection is working.
---

# X Setup

Use the `x` MCP server connected to `https://api.x.com/mcp` (prefer `?read_only=true`).

## Steps

1. Call `get_users_me`. If it succeeds, greet the user by their X name and `@username` and confirm the connection works.
2. Call `get_usage_credits` and report the remaining balance in USD. If the call fails, skip this step without alarming the user — some apps can't read billing.
3. Explain the cost in one or two sentences: X bills the X developer app's pay-per-use credits about half a cent per post returned, so a search costs a few cents and reading hundreds of bookmarks costs a dollar or more. The plugin keeps results small and asks before large scans.
4. Suggest three things to try:
   - "Find my X bookmarks about design"
   - "What are people on X saying about AI today?"
   - "What has @OpenAI posted this week?"

Keep the whole reply short. Do not list bookmarks or run searches during setup unless the user asks.

## If the connection fails

- **401 / unauthorized** — the X sign-in expired or was revoked. Ask the user to reconnect the plugin in ChatGPT's plugin settings.
- **Credits or billing errors** — the X developer app is out of credits. Point the user to `https://console.x.com` to add credits.
- **"client-not-enrolled" or similar** — the X app must use the **Pay-per-use** package in the **Production** environment.

Setup is read-only. Never post, like, follow, or change anything on X.
