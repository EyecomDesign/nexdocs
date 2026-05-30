import type { NextConfig } from "next"
import nextra from "nextra"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

initOpenNextCloudflareForDev()

const withNextra = nextra({
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
})

const nextConfig: NextConfig = {
  // OpenNext expects the standalone build output (.next/standalone/...).
  // Normally OpenNext sets this implicitly when it invokes `next build`
  // internally, but our build chain runs `next build` first (so Pagefind
  // can index .next/server/app) and then opennextjs-cloudflare --skipNextBuild
  // — so we have to opt into standalone explicitly here.
  output: "standalone",
  // Pages Router setting that Next.js App Router ignores, but Nextra 4
  // reads it to build per-locale page maps. Without this, getPageMap(`/en`)
  // throws "Can't find pageMap for 'en' in route '/en'" at runtime.
  i18n: {
    locales: ["en", "de"],
    defaultLocale: "en",
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Locale root → /en
      { source: "/", destination: "/en", permanent: false },
      // Locale-aware section indexes (Next.js path params)
      { source: "/:lang(en|de)/general", destination: "/:lang/general/what-is-nexor", permanent: false },
      { source: "/:lang(en|de)/getting-started", destination: "/:lang/getting-started/buy-nexor", permanent: false },
      { source: "/:lang(en|de)/profile-creator", destination: "/:lang/profile-creator/grinding-profiles", permanent: false },
      { source: "/:lang(en|de)/developer", destination: "/:lang/developer/grinding-profiles", permanent: false },
      { source: "/:lang(en|de)/server", destination: "/:lang/server/overview", permanent: false },
      { source: "/:lang(en|de)/world-api", destination: "/:lang/world-api/overview", permanent: false },
      { source: "/:lang(en|de)/faq", destination: "/:lang/faq/faq", permanent: false },
      { source: "/:lang(en|de)/general/features", destination: "/:lang/general/features/included-profiles", permanent: false },
      { source: "/:lang(en|de)/getting-started/buy-unlocker", destination: "/:lang/getting-started/buy-unlocker/noname-windows", permanent: false },
      { source: "/:lang(en|de)/getting-started/download-and-install", destination: "/:lang/getting-started/download-and-install/nexor", permanent: false },
      { source: "/:lang(en|de)/developer/nexor-docs", destination: "/:lang/developer/nexor-docs/introduction", permanent: false },
      { source: "/:lang(en|de)/faq/guides", destination: "/:lang/faq/guides/how-to-add-a-session-to-nexor", permanent: false },
      { source: "/:lang(en|de)/faq/guides/how-to-create-profiles", destination: "/:lang/faq/guides/how-to-create-profiles/questing-profile", permanent: false },
    ]
  },
}

export default withNextra(nextConfig)
