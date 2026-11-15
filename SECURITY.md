# Security

## Secrets

Never commit:

- `.env.local` / `.env`
- X **Client Secret**, Consumer Secret, Bearer token, or user access tokens
- Contents of `~/.xurl`

This repo’s committed `mcp.json` may only contain the public **Client ID** placeholder (`YOUR_X_APP_CLIENT_ID`). Run `npm run configure` locally; restore placeholders before pushing (`npm run check:template` / CI will fail if a real ID is committed).

## Reporting a vulnerability

Please open a **private** security advisory on GitHub if available, or email the maintainers via the org contact on [github.com/newyorkcompute](https://github.com/newyorkcompute). Do not file a public issue that includes credentials or tokens.

## Scope notes

- Prefer `https://api.x.com/mcp?read_only=true` so write tools are omitted by X.
- ChatGPT confirms write actions based on its own policies; the bundled skill still requires an explicit user “yes” before destructive or messaging actions.
- Each operator is responsible for their own X API billing and compliance with X’s Developer Agreement.
