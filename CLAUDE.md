# NexDocs

English-only documentation site for **Nexor**, a Lua-based WoW bot. Live at https://docs.nexor.app, served by a Cloudflare Worker built with OpenNext.

## Stack

- **Next.js 16** (App Router) + **Nextra 4** (`nextra-theme-docs`)
- **Tailwind v4**
- **@opennextjs/cloudflare** — Workers build/deploy adapter
- **Pagefind** — client-side search index built at deploy time
- **pnpm** — package manager (v10)

## Content layout — English directory, NOT filename-suffix

```
content/
├── en/
│   ├── _meta.ts
│   ├── server/
│   │   ├── _meta.ts
│   │   └── overview.mdx
│   └── ...
```

Nextra 2.x used `foo.en.mdx` / `foo.de.mdx`. **Nextra 4 + App Router does not** — content belongs in `content/en/<path>.mdx`.

`_meta.ts` in each directory controls sidebar order and labels. The historical
German tree is kept at `content-de-disabled/` as an unpublished backup; do not
add or maintain German pages unless English-only support is explicitly reversed.

## Adding or editing a page

1. Edit / create `content/en/<section>/<page>.mdx`
2. Add / reorder the entry in the same directory's `_meta.ts`
3. Commit + push to `main`
4. GitHub Actions deploys in ~2 min — watch `.github/workflows/deploy.yml`

## Deploy pipeline

| | |
|---|---|
| Trigger | `push` to `main` |
| Workflow | `.github/workflows/deploy.yml` |
| Build | `pnpm run build:cf` → `next build` → `pagefind` indexer → `opennextjs-cloudflare build --skipNextBuild` |
| Deploy | `pnpm exec opennextjs-cloudflare deploy` (auto-detects OpenNext, calls `wrangler deploy`) |
| Auth | GitHub secret `CLOUDFLARE_API_TOKEN` (account-scoped, Workers Edit) |
| Account | `39c1241084a7b95eceea1e1892dd20f0` (Hi@nexor.app) — hardcoded in workflow env |
| Worker name | `nexdocs` (also reachable at `nexdocs.hi-39c.workers.dev`) |
| Custom domain | `docs.nexor.app` (managed via Workers Custom Domains binding, not a CNAME) |

PRs run a separate `.github/workflows/ci.yml` (typecheck + lint + build) before merge.

## Critical Nextra 4 + App Router conventions to remember

- **`next.config.ts` MUST contain `i18n: { locales: ['en'], defaultLocale: 'en' }`** — Next App Router ignores this block, but Nextra reads it to build the English page map. Removing it breaks runtime with *"Can't find pageMap for 'en'"*.
- **The catch-all at `app/[lang]/[[...mdxPath]]/page.tsx` MUST coerce `params.mdxPath ?? []`** before calling `importPage(mdxPath, lang)`. Otherwise visiting `/en` (empty optional catch-all) resolves to `content/en/undefined` and 500s.
- **`app/[lang]/layout.tsx` MUST render `<Head />` from `nextra/components`** inside `<html>` for Nextra's runtime initialization to work.
- **Do NOT add a `proxy.ts` re-exporting `nextra/locales`** — OpenNext on Workers rejects Node-runtime middleware. Locale normalization lives in `middleware.ts`; legacy paths ultimately resolve to `/en`.

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: *"Cannot find module 'private-next-content-dir/&lt;lang&gt;/undefined'"* | `?? []` coercion missing in `page.tsx` | Restore `importPage(params.mdxPath ?? [], params.lang)` |
| Build fails: *"Pagefind was not able to build an index"* | Pagefind ran before SSG output existed, or pointed at the wrong dir | `build:cf` order MUST be: `next build` → `pagefind --site .next/server/app` → `opennextjs-cloudflare build --skipNextBuild` |
| Build fails: *"Node.js middleware is not currently supported"* | A `proxy.ts` exists with Node-runtime middleware | Delete `proxy.ts`; do redirects in `next.config.ts` |
| Runtime 500: *"Cannot use 'in' operator to search for 'data' in undefined"* | Content still in old `.en.mdx` / `.de.mdx` filename-suffix layout | Move the published page to `content/en/<path>.mdx` |
| Runtime 500: *"Can't find pageMap for 'en'"* | `i18n` block missing from `next.config.ts` | Re-add the block |

## Useful commands

| Command | What |
|---|---|
| `pnpm dev` | Local Next.js dev server (no Worker simulation) |
| `pnpm build` | Plain `next build` — used by CI for typecheck/build verification |
| `pnpm build:cf` | Full Cloudflare build: `next build` → `pagefind` → `opennextjs-cloudflare build --skipNextBuild` |
| `pnpm preview` | Build then run the Worker locally via `opennextjs-cloudflare preview` |
| `pnpm deploy` | Build + deploy from your machine (rarely needed; GitHub Actions handles this) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |
| `wrangler tail nexdocs` | Stream live worker logs |

## Files NOT to recreate without a reason

- **`proxy.ts`** — Workers can't run the old Nextra locale middleware. Locale handling is in `middleware.ts` plus the English-only `[lang]` segment.
- **`Untitled` at repo root** — once contained a leaked Clerk test secret. Deleted from HEAD; **still present in git history at commit `6340dd7`**. The Clerk test key was explicitly left un-rotated by the project owner.
- **`scripts/seed-users.ts`** — held a hardcoded admin email + password. Removed.
- **`content/internal/*`** — was meant to be admin-gated, but visibility checks are gone. Don't re-add without auth.
- **Anything Clerk-, Prisma-, or Postgres-related** — the auth/DB scaffolding was intentionally stripped in PR #4. Re-introducing requires bindings (Hyperdrive), Workers env vars, and runtime adapter changes. See `wrangler.jsonc` for commented placeholders showing where bindings would go.

## Troubleshooting deploys

- **Build logs**: GitHub → Actions tab → latest "Deploy to Cloudflare Workers" run.
- **Runtime logs**: Cloudflare dashboard → Workers & Pages → `nexdocs` → Logs/Observability tab. Or `wrangler tail nexdocs`.
- **Live URL stuck on old content**: deployment may still be propagating; wait ~30s. Worker version IDs appear in deployment headers.
- **Search returns nothing on live site**: verify `https://docs.nexor.app/_pagefind/pagefind.js` returns 200. If 404, the build chain skipped Pagefind or OpenNext didn't bundle `public/_pagefind/`.
