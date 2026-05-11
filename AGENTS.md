# Agents

## Stack

- **Runtime**: Bun (not Node.js). Use `bun run`, `bun --watch`, `bun build`.
- **Server**: `Bun.serve()` in `index.ts`. No Express/Fastify.
- **No tests, lint, or typecheck scripts** are defined in `package.json`.

## Dev commands

```sh
bun run dev      # watch mode (reloads on changes)
bun run start    # production start
bun run build    # builds to dist/ (for Vercel)
```

## Server behavior

- **Port**: defaults to 3003, override with `PORT` env var.
- **Routes**:
  - `POST /chat` — receives `{ messages: ChatMessage[] }`, streams AI response as `text/plain`
  - `OPTIONS /chat` — CORS preflight
  - Everything else → 404
- **Idle timeout**: 0 (unlimited) — reasoning models can take long to respond.
- **CORS**: all origins (`*`).
- **Service rotation**: `services[]` array in `index.ts` is rotated round-robin. Currently active: `opencodeService`. Comment out others to disable.

## Services

- `services/opencode.ts` — OpenCode Go API (active)
- `services/groq.ts` — Groq SDK (disabled)
- `services/cerebras.ts` — Cerebras SDK (disabled)

All append the same `systemPrompt` (defined in `services/groq.ts`) to every request.

## Environment variables

Required for the active service (`services/opencode.ts`):
- `API_KEY_OPENCODE_GO`
- `OPENCODE_GO_URL`

Others (not needed unless enabling respective service):
- `API_KEY_GROQ`
- `API_KEY_CEREBRAS`

`.env` is gitignored. `.env.local` is Vercel-generated and also gitignored.

## Vercel deployment

`vercel.json` rewrites all routes to `index.ts`. Output goes to `dist/`. Bun version: `1.x`.