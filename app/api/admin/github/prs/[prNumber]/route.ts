import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"
import type { NexDocsMetadata } from "@/lib/auth"
import { z } from "zod"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO

async function requireAdmin() {
  const user = await currentUser()
  if (!user) return false
  const metadata: NexDocsMetadata = {
    role: (user.publicMetadata?.role as NexDocsMetadata["role"]) ?? undefined,
    canEdit: typeof user.publicMetadata?.canEdit === "boolean"
      ? user.publicMetadata.canEdit
      : undefined,
  }
  return isAdmin(metadata)
}

const ActionSchema = z.object({
  action: z.enum(["merge", "close"]),
  mergeMethod: z.enum(["merge", "squash", "rebase"]).default("squash"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ prNumber: string }> },
) {
  const isAdminUser = await requireAdmin()
  if (!isAdminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return NextResponse.json(
      { error: "GitHub integration not configured." },
      { status: 503 },
    )
  }

  const { prNumber } = await params
  const num = parseInt(prNumber, 10)
  if (isNaN(num)) {
    return NextResponse.json({ error: "Invalid PR number" }, { status: 400 })
  }

  const body = await request.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { action, mergeMethod } = parsed.data

  if (action === "merge") {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/pulls/${num}/merge`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ merge_method: mergeMethod }),
      },
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `GitHub API error: ${res.status} ${text}` },
        { status: 502 },
      )
    }

    return NextResponse.json({ data: { ok: true, action: "merged" } })
  }

  // close
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/pulls/${num}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: "closed" }),
    },
  )

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: `GitHub API error: ${res.status} ${text}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ data: { ok: true, action: "closed" } })
}
