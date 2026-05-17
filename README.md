# NexDocs

Documentation site for **Nexor** — a bot built in Lua 5.1.

Live at **https://docs.nexor.app**. Pushes to `master` auto-deploy to Cloudflare Workers via a GitHub Actions workflow.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [Nextra](https://nextra.site/) 4 (theme: `nextra-theme-docs`)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [OpenNext](https://opennext.js.org/cloudflare) for Cloudflare Workers deployment
- [Pagefind](https://pagefind.app/) for client-side search
- pnpm (v10)

## Local development

```bash
pnpm install
pnpm dev
```

The dev server runs on http://localhost:3000. The search box won't work in `pnpm dev` (Pagefind needs a built index); use `pnpm preview` to see search locally.

## Writing docs

Content lives under `content/<locale>/` as MDX. Nextra 4 uses **directory-based locales** (not the `.en.mdx` / `.de.mdx` filename suffix from Nextra 2.x), so a typical layout is:

```
content/
├── en/
│   ├── _meta.json
│   ├── index.mdx
│   └── server/
│       ├── _meta.json
│       └── overview.mdx
└── de/
    └── (same shape)
```

`_meta.json` in each directory controls sidebar order and labels for that locale. Keep both `en/` and `de/` in parity — add or translate every page in both.

See the in-site guides for the full flow:
- [Creating a new page](https://docs.nexor.app/en/guides/creating-a-page)
- [Updating an existing page](https://docs.nexor.app/en/guides/editing-a-page)

## Deployment

`.github/workflows/deploy.yml` runs on every push to `master`:

1. `pnpm install --frozen-lockfile`
2. `pnpm run build:cf` — runs `next build`, then Pagefind (against `.next/server/app`), then `opennextjs-cloudflare build --skipNextBuild` to bundle everything into a Worker
3. `pnpm exec opennextjs-cloudflare deploy` — uses the `CLOUDFLARE_API_TOKEN` GitHub secret to deploy to the `nexdocs` Worker

End-to-end takes ~2 minutes from `git push` to live update.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server (no Worker simulation, no search index) |
| `pnpm build` | Plain `next build` — used by CI for typecheck/build verification |
| `pnpm build:cf` | Full Cloudflare build: `next build` → `pagefind` → `opennextjs-cloudflare build --skipNextBuild` |
| `pnpm preview` | Build then run the Worker locally via `opennextjs-cloudflare preview` (search works here) |
| `pnpm deploy` | Build + deploy directly from your machine (rarely needed; GitHub Actions handles this) |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

See `CLAUDE.md` for deeper architectural notes and gotchas.
