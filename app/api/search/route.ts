import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { meetsVisibilityTier, extractMetadata } from "@/lib/auth"

export async function GET(request: Request) {
  const { userId, sessionClaims } = await auth()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 })
  }

  const metadata = userId
    ? extractMetadata(sessionClaims as Record<string, unknown>)
    : null

  // Determine which tiers the user can access
  const allowedTiers: ("PUBLIC" | "PARTNER" | "ADMIN")[] = ["PUBLIC"]
  if (metadata) {
    if (meetsVisibilityTier(metadata, "PARTNER")) allowedTiers.push("PARTNER")
    if (meetsVisibilityTier(metadata, "ADMIN")) allowedTiers.push("ADMIN")
  }

  const results = await db.pageVisibility.findMany({
    where: {
      tier: { in: allowedTiers },
      path: { contains: query, mode: "insensitive" },
    },
    take: 20,
  })

  return NextResponse.json({ data: results.map((r) => ({ path: r.path, tier: r.tier })) })
}
