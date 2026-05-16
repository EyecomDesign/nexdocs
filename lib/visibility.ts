import { getDbAsync } from "@/lib/db"

type VisibilityTier = "PUBLIC" | "PARTNER" | "ADMIN"

/**
 * Resolves the visibility tier for a given pathname.
 *
 * Resolution order (most-specific wins):
 *   1. SectionVisibility — checks every ancestor path segment
 *   2. PageVisibility    — exact path match
 *   3. Default           → PUBLIC
 */
export async function resolveVisibility(
  pathname: string,
): Promise<VisibilityTier> {
  // Normalise: strip trailing slash, ensure leading slash
  const clean = "/" + pathname.replace(/^\/|\/$/g, "")
  const segments = clean.split("/").filter(Boolean)

  // Build all ancestor paths from most-specific to root, e.g.:
  //   /guides/getting-started → ["/guides/getting-started", "/guides", "/"]
  const ancestorPaths: string[] = []
  for (let i = segments.length; i >= 0; i--) {
    ancestorPaths.push("/" + segments.slice(0, i).join("/"))
  }

  const db = await getDbAsync()
  // Check section overrides (most specific match wins)
  const sectionRecord = await db.sectionVisibility.findFirst({
    where: { path: { in: ancestorPaths } },
    orderBy: { path: "desc" }, // longer path = more specific
  })

  if (sectionRecord) {
    return sectionRecord.tier as VisibilityTier
  }

  // Fall back to page-level rule
  const pageRecord = await db.pageVisibility.findUnique({
    where: { path: clean },
  })

  if (pageRecord) {
    return pageRecord.tier as VisibilityTier
  }

  return "PUBLIC"
}
