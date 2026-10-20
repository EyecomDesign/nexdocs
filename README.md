# NexDocs

Documentation site for **Nexor** — a bot built in Lua 5.1.

Live at **https://docs.nexor.app**. Pushes to `main` auto-deploy to Cloudflare Workers via a GitHub Actions workflow.

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

Published content lives under `content/en/` as MDX. Nextra 4 uses a
**directory-based locale** (not the `.en.mdx` / `.de.mdx` filename suffix from
Nextra 2.x), so a typical layout is:

```
content/
├── en/
│   ├── _meta.ts
│   ├── index.mdx
│   └── server/
│       ├── _meta.ts
│       └── overview.mdx
```

`_meta.ts` in each directory controls sidebar order and labels. The former
German source is kept outside Nextra at `content-de-disabled/` and is
not published or built while the site is English-only.

See the in-site guides for the full flow:
- [Creating a new page](https://docs.nexor.app/en/guides/creating-a-page)
- [Updating an existing page](https://docs.nexor.app/en/guides/editing-a-page)

## Public content safety

Run `pnpm check:public-content` before committing a page or a textual download.
The same check runs before both production build scripts, in pull-request CI and
before deployment. Its tests use Node's built-in runner:
`pnpm test:public-content`.

The check scans `content/en/` and textual files under `public/`. It flags
credential assignments and access tables, URLs with credentials, literal host
addresses, operator logins/home paths, private-key blocks and instructions to put
replacement credentials into public pages. Explicit placeholders, environment
references, loopback/bind addresses and documentation example addresses are
accepted. Publication symlinks require review instead of being silently followed.

A finding reports only a relative file, line and rule. Inspect the file locally;
do not paste the matched value into a public issue, log or screenshot. Replace
operational details with a placeholder or the approved private access procedure.

This is a focused content-policy check, not a complete secret detector. It does
not inspect Git history, binary downloads, compressed search fragments or the
live deployment. CI runs after a push and cannot undo a credential already
published in Git. If exposure occurs, involve the authorized operator for private
assessment/rotation and verify rebuilt search and deployed output separately.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm run build:cf` — runs `next build`, then Pagefind (against `.next/server/app`), then `opennextjs-cloudflare build --skipNextBuild` to bundle everything into a Worker
3. `pnpm exec opennextjs-cloudflare deploy` — uses the `CLOUDFLARE_API_TOKEN` GitHub secret to deploy to the `nexdocs` Worker

End-to-end takes ~2 minutes from `git push` to live update.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server (no Worker simulation, no search index) |
| `pnpm start` | Run the standalone production server after `pnpm build` |
| `pnpm build` | Plain `next build` — used by CI for typecheck/build verification |
| `pnpm build:cf` | Full Cloudflare build: `next build` → `pagefind` → `opennextjs-cloudflare build --skipNextBuild` |
| `pnpm preview` | Build then run the Worker locally via `opennextjs-cloudflare preview` (search works here) |
| `pnpm deploy` | Build + deploy directly from your machine (rarely needed; GitHub Actions handles this) |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

See `CLAUDE.md` for deeper architectural notes and gotchas.
