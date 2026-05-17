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
      { source: "/general", destination: "/general/what-is-nexor", permanent: false },
      { source: "/getting-started", destination: "/getting-started/buy-nexor", permanent: false },
      { source: "/profile-creator", destination: "/profile-creator/grinding-profiles", permanent: false },
      { source: "/developer", destination: "/developer/grinding-profiles", permanent: false },
      { source: "/server", destination: "/server/overview", permanent: false },
      { source: "/faq", destination: "/faq/faq", permanent: false },
      { source: "/general/features", destination: "/general/features/included-profiles", permanent: false },
      { source: "/getting-started/buy-unlocker", destination: "/getting-started/buy-unlocker/noname-windows", permanent: false },
      { source: "/getting-started/download-and-install", destination: "/getting-started/download-and-install/nexor", permanent: false },
      { source: "/developer/nexor-docs", destination: "/developer/nexor-docs/introduction", permanent: false },
      { source: "/faq/guides", destination: "/faq/guides/how-to-add-a-session-to-nexor", permanent: false },
      { source: "/faq/guides/how-to-create-profiles", destination: "/faq/guides/how-to-create-profiles/questing-profile", permanent: false },
    ]
  },
}

export default withNextra(nextConfig)
