import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

// Every docs page is prerendered at build time. Serve that output from Workers
// static assets instead of re-rendering in the Worker, which exceeds the CPU
// time limit (Cloudflare error 1102) on the larger pages.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
