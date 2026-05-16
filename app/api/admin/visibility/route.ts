import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { canEdit } from "@/lib/auth"
import type { NexDocsMetadata } from "@/lib/auth"

async function requireCanEdit() {
  const user = await currentUser()
  if (!user) return false
  const metadata: NexDocsMetadata = {
    role: (user.publicMetadata?.role as NexDocsMetadata["role"]) ?? undefined,
    canEdit: typeof user.publicMetadata?.canEdit === "boolean"
      ? user.publicMetadata.canEdit
      : undefined,
  }
  return canEdit(metadata)
}

export async function GET() {
  const allowed = await requireCanEdit()
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = getDb()
  const [pages, sections] = await Promise.all([
    db.pageVisibility.findMany({ orderBy: { path: "asc" } }),
    db.sectionVisibility.findMany({ orderBy: { path: "asc" } }),
  ])

  type PageRow = (typeof pages)[number]
  type SectionRow = (typeof sections)[number]

  const data = [
    ...pages.map((p: PageRow) => ({ ...p, type: "page" as const })),
    ...sections.map((s: SectionRow) => ({ ...s, type: "section" as const })),
  ].sort((a, b) => a.path.localeCompare(b.path))

  return NextResponse.json({ data })
}

const PathSchema = z.object({
  path: z.string().refine((v) => v.startsWith("/"), { message: "Path must start with /" }),
  type: z.enum(["page", "section"]),
})

const UpdateSchema = PathSchema.extend({
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

  const db = getDb()
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

export async function DELETE(request: Request) {
  const allowed = await requireCanEdit()
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = PathSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { path, type } = parsed.data

  const db = getDb()
  if (type === "page") {
    await db.pageVisibility.deleteMany({ where: { path } })
  } else {
    await db.sectionVisibility.deleteMany({ where: { path } })
  }

  return NextResponse.json({ data: { ok: true } })
}
