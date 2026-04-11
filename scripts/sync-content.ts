/**
 * Post-deploy content sync script.
 *
 * Removes orphaned PageVisibility and SectionVisibility records whose paths
 * no longer correspond to a file in the /content directory.
 *
 * Run: npx tsx scripts/sync-content.ts
 * Railway start command: npx prisma migrate deploy && npx tsx scripts/sync-content.ts && node server.js
 */

import { readdir } from "node:fs/promises"
import { join, relative, extname } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("[sync] ERROR: DATABASE_URL is not set — aborting deploy")
  process.exit(1)
}
const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

async function walkContent(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const paths: string[] = []

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      paths.push(...(await walkContent(full)))
    } else if (entry.isFile() && extname(entry.name) === ".mdx") {
      paths.push(full)
    }
  }

  return paths
}

function toSlug(absPath: string, contentDir: string): string {
  const rel = relative(contentDir, absPath)
  // Remove .mdx extension and convert OS separators to /
  const withoutExt = rel.replace(/\.mdx$/, "").replace(/\\/g, "/")
  // Strip trailing /index
  const withoutIndex = withoutExt.replace(/\/index$/, "")
  return "/" + withoutIndex
}

async function main() {
  const contentDir = join(process.cwd(), "content")

  let mdxFiles: string[]
  try {
    mdxFiles = await walkContent(contentDir)
  } catch {
    console.error("[sync] ERROR: Cannot read content directory — aborting deploy")
    process.exit(1)
  }

  const validSlugs = new Set(mdxFiles.map((f) => toSlug(f, contentDir)))
  console.log(`[sync] Found ${validSlugs.size} content files`)

  // Clean up orphaned PageVisibility records
  const pageRecords = await prisma.pageVisibility.findMany()
  for (const record of pageRecords) {
    if (!validSlugs.has(record.path)) {
      await prisma.pageVisibility.delete({ where: { id: record.id } })
      console.log(`[sync] removed orphan (page): ${record.path}`)
    }
  }

  // Clean up orphaned SectionVisibility records
  const sectionRecords = await prisma.sectionVisibility.findMany()
  for (const record of sectionRecords) {
    // Section paths are directory-level — check if any valid slug starts with that prefix
    const hasChildren = [...validSlugs].some((slug) =>
      slug.startsWith(record.path + "/") || slug === record.path,
    )
    if (!hasChildren) {
      await prisma.sectionVisibility.delete({ where: { id: record.id } })
      console.log(`[sync] removed orphan (section): ${record.path}`)
    }
  }

  // Seed default ADMIN visibility for /internal section if not already set
  await prisma.sectionVisibility.upsert({
    where: { path: "/internal" },
    create: { path: "/internal", tier: "ADMIN" },
    update: {},
  })

  console.log("[sync] Done")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("[sync] FATAL:", err)
  process.exit(1)
})
