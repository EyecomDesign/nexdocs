# NexDocs

Documentation site for **Nexor** — a bot built in Lua 5.1.

Live at **https://docs.nexor.app**. Pushes to `master` auto-deploy to Cloudflare Workers via Workers Builds.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [Nextra](https://nextra.site/) 4 (theme: `nextra-theme-docs`)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [OpenNext](https://opennext.js.org/cloudflare) for Cloudflare Workers deployment
- [Pagefind](https://pagefind.app/) for client-side search
- pnpm (workspace package manager)

## Local development

```bash
pnpm install
pnpm dev
```

The dev server runs on http://localhost:3000.

## Writing docs

All content lives under `content/` as MDX files. Each section has a `_meta.ts` controlling sidebar order and labels.

See the in-site guides for the full flow:
- [Creating a new page](https://docs.nexor.app/guides/creating-a-page)
- [Updating an existing page](https://docs.nexor.app/guides/editing-a-page)

## Deployment

Cloudflare Workers Builds is wired to this repo. On push to `master`:

1. `pnpm install`
2. `pnpm run build:cf` — runs `opennextjs-cloudflare build` then Pagefind indexing
3. `npx wrangler deploy` — auto-detects OpenNext, ships the worker

No env vars or bindings are required for the current docs-only deploy.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | `next build` (CI typecheck path) |
| `pnpm build:cf` | OpenNext build + Pagefind index — what production uses |
| `pnpm preview` | Build and locally serve the Worker via `wrangler dev` |
| `pnpm deploy` | Build and deploy directly from your machine (rarely needed; Workers Builds handles this) |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
