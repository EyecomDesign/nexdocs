import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { canEdit, extractMetadata } from "@/lib/auth"

async function requireCanEdit() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return false
  const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
  return canEdit(metadata)
}

export async function GET() {
  const allowed = await requireCanEdit()
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [pages, sections] = await Promise.all([
    db.pageVisibility.findMany({ orderBy: { path: "asc" } }),
    db.sectionVisibility.findMany({ orderBy: { path: "asc" } }),
  ])

  const data = [
    ...pages.map((p) => ({ ...p, type: "page" as const })),
    ...sections.map((s) => ({ ...s, type: "section" as const })),
  ].sort((a, b) => a.path.localeCompare(b.path))

  return NextResponse.json({ data })
}

const UpdateSchema = z.object({
  path: z.string().startsWith("/"),
  type: z.enum(["page", "section"]),
  tier: z.enum(["PUBLIC", "PARTNER", "ADMIN"]),
})

export async function PUT(request: Request) {
  const allowed = await requireCanEdit()
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { path, type, tier } = parsed.data

  if (type === "page") {
    await db.pageVisibility.upsert({
      where: { path },
      create: { path, tier },
      update: { tier },
    })
  } else {
    await db.sectionVisibility.upsert({
      where: { path },
      create: { path, tier },
      update: { tier },
    })
  }

  return NextResponse.json({ data: { ok: true } })
}
