import type { NextConfig } from "next";
import nextra from "nextra";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const withNextra = nextra({
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
  unstable_shouldAddLocaleToLinks: true,
});

const nextConfig: NextConfig = {
  // OpenNext expects the standalone build output (.next/standalone/...).
  // Normally OpenNext sets this implicitly when it invokes `next build`
  // internally, but our build chain runs `next build` first (so Pagefind
  // can index .next/server/app) and then opennextjs-cloudflare --skipNextBuild
  // — so we have to opt into standalone explicitly here.
  output: "standalone",
  // Pages Router setting that Next.js App Router ignores, but Nextra 4
  // reads it to build the English page map. Without this, getPageMap(`/en`)
  // throws "Can't find pageMap for 'en' in route '/en'" at runtime.
  i18n: {
    locales: ["en"],
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
    ];
  },
  async redirects() {
    return [
      // Locale root → Introduction
      { source: "/", destination: "/en/introduction", permanent: false },
      {
        source: "/:lang(en)",
        destination: "/:lang/introduction",
        permanent: false,
      },
      // Legacy section paths
      {
        source: "/:lang(en)/general",
        destination: "/:lang/introduction",
        permanent: false,
      },
      {
        source: "/:lang(en)/general/:path*",
        destination: "/:lang/introduction",
        permanent: false,
      },
      {
        source: "/:lang(en)/getting-started",
        destination: "/:lang/introduction/getting-started/buy-nexor",
        permanent: false,
      },
      {
        source: "/:lang(en)/introduction/getting-started",
        destination: "/:lang/introduction/getting-started/buy-nexor",
        permanent: false,
      },
      {
        source: "/:lang(en)/getting-started/buy-unlocker",
        destination:
          "/:lang/introduction/getting-started/buy-unlocker/noname-windows",
        permanent: false,
      },
      {
        source: "/:lang(en)/getting-started/download-and-install",
        destination:
          "/:lang/introduction/getting-started/download-and-install/nexor",
        permanent: false,
      },
      {
        source: "/:lang(en)/getting-started/:path*",
        destination: "/:lang/introduction/getting-started/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/profile-creator",
        destination: "/:lang/developer/profiles/questing-profiles",
        permanent: false,
      },
      {
        source: "/:lang(en)/profile-creator/task-routines",
        destination: "/:lang/developer/tasks/task-routines",
        permanent: false,
      },
      {
        source: "/:lang(en)/profile-creator/:path*",
        destination: "/:lang/developer/profiles/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/grinding-profiles",
        destination: "/:lang/developer/profiles",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/profile-creator/task-routines",
        destination: "/:lang/developer/tasks/task-routines",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/profile-creator/questing-profiles",
        destination: "/:lang/developer/profiles/questing-profiles",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/profile-creator",
        destination: "/:lang/developer/profiles/questing-profiles",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/profile-creator/:path*",
        destination: "/:lang/developer/profiles/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/server",
        destination: "/:lang/administrator/server/overview",
        permanent: false,
      },
      {
        source: "/:lang(en)/server/:path*",
        destination: "/:lang/administrator/server/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/world-api",
        destination: "/:lang/administrator/world-api/overview",
        permanent: false,
      },
      {
        source: "/:lang(en)/world-api/:path*",
        destination: "/:lang/administrator/world-api/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/administrator",
        destination: "/:lang/administrator/server/overview",
        permanent: false,
      },
      {
        source: "/:lang(en)/trinitycore-mmap-export",
        destination: "/:lang/administrator/trinitycore-mmap-export",
        permanent: false,
      },
      {
        source: "/:lang(en)/faq",
        destination: "/:lang/introduction/helpcenter/faq",
        permanent: false,
      },
      {
        source: "/:lang(en)/faq/:path*",
        destination: "/:lang/introduction/helpcenter/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/introduction/helpcenter",
        destination: "/:lang/introduction/helpcenter/faq",
        permanent: false,
      },
      // Legacy combined rotation-authoring lessons
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/01-environment",
        destination: "/:lang/developer/rotations/rotation-authoring/course/03-environment",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/02-units-and-targets",
        destination: "/:lang/developer/rotations/rotation-authoring/course/09-unit-lookups",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/03-pulses",
        destination: "/:lang/developer/rotations/rotation-authoring/course/10-pulse-contract",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/04-spells-and-priority",
        destination: "/:lang/developer/rotations/rotation-authoring/course/14-spell-policy",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/05-pets",
        destination: "/:lang/developer/rotations/rotation-authoring/course/17-pet-maintenance",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/06-items-settings-and-wands",
        destination: "/:lang/developer/rotations/rotation-authoring/course/20-healthstone-availability",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/07-multipull-and-complete-source",
        destination: "/:lang/developer/rotations/rotation-authoring/course/26-complete-source",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/08-audit-and-validation",
        destination: "/:lang/developer/rotations/rotation-authoring/course/27-audit-and-validation",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/rotations/rotation-authoring/course/09-custom-movement",
        destination: "/:lang/developer/rotations/rotation-authoring/course/28-movement-ownership",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs/rotation-authoring/api",
        destination: "/:lang/developer/api",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs/rotation-authoring/api/:path*",
        destination: "/:lang/developer/api/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs/rotation-authoring/course",
        destination: "/:lang/developer/rotations/rotation-authoring/course",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs/rotation-authoring/course/:path*",
        destination: "/:lang/developer/rotations/rotation-authoring/course/:path*",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs/rotation-authoring",
        destination: "/:lang/developer/rotations/rotation-authoring",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs/introduction",
        destination: "/:lang/developer",
        permanent: false,
      },
      {
        source: "/:lang(en)/developer/nexor-docs",
        destination: "/:lang/developer/api",
        permanent: false,
      },
    ];
  },
};

export default withNextra(nextConfig);
