import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { canEdit } from "@/lib/auth"
import type { NexDocsMetadata } from "@/lib/auth"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO // e.g. "your-org/nexdocs"

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

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return NextResponse.json(
      { error: "GitHub integration not configured. Set GITHUB_TOKEN and GITHUB_REPO." },
      { status: 503 },
    )
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  )

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: `GitHub API error: ${res.status} ${text}` },
      { status: 502 },
    )
  }

  type GHPull = {
    number: number
    title: string
    html_url: string
    state: string
    draft: boolean
    created_at: string
    updated_at: string
    user: { login: string; avatar_url: string; html_url: string }
    body: string | null
    head: { ref: string; sha: string }
    base: { ref: string }
    changed_files?: number
    additions?: number
    deletions?: number
  }

  const pulls: GHPull[] = await res.json()

  // Fetch file lists in parallel to filter PRs that touch content/
  const withFiles = await Promise.all(
    pulls.map(async (pr) => {
      const filesRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/pulls/${pr.number}/files?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      )

      if (!filesRes.ok) return null

      type GHFile = { filename: string; status: string; additions: number; deletions: number }
      const files: GHFile[] = await filesRes.json()
      const contentFiles = files.filter((f) => f.filename.startsWith("content/"))

      return {
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        draft: pr.draft,
        author: { login: pr.user.login, avatar: pr.user.avatar_url, url: pr.user.html_url },
        body: pr.body ?? "",
        branch: pr.head.ref,
        base: pr.base.ref,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        contentFiles: contentFiles.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        })),
        totalFiles: files.length,
      }
    }),
  )

  // Only return PRs that touch content/
  const data = withFiles.filter(
    (pr) => pr !== null && pr.contentFiles.length > 0,
  )

  return NextResponse.json({ data })
}
