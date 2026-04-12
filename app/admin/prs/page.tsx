"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

type ContentFile = {
  filename: string
  status: string
  additions: number
  deletions: number
}

type PR = {
  number: number
  title: string
  url: string
  draft: boolean
  author: { login: string; avatar: string; url: string }
  body: string
  branch: string
  base: string
  createdAt: string
  updatedAt: string
  contentFiles: ContentFile[]
  totalFiles: number
}

type ActionState = { prNumber: number; action: "merge" | "close" } | null

export default function PRsPage() {
  const [prs, setPrs] = useState<PR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [acting, setActing] = useState<ActionState>(null)
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("squash")

  useEffect(() => {
    fetch("/api/admin/github/prs")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setPrs(d.data ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load pull requests.")
        setLoading(false)
      })
  }, [])

  async function performAction(prNumber: number, action: "merge" | "close") {
    setActing({ prNumber, action })
    const res = await fetch(`/api/admin/github/prs/${prNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, mergeMethod }),
    })
    const data = await res.json()
    setActing(null)

    if (!res.ok) {
      alert(`Error: ${data.error}`)
      return
    }

    setPrs((prev) => prev.filter((pr) => pr.number !== prNumber))
  }

  const isActing = (prNumber: number) => acting?.prNumber === prNumber

  if (loading) {
    return <p className="text-muted-foreground">Loading pull requests…</p>
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Pull Requests</h1>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Pull Requests</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Merge method:</span>
          <Select
            value={mergeMethod}
            onValueChange={(v) =>
              setMergeMethod(v as "merge" | "squash" | "rebase")
            }
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="squash">Squash</SelectItem>
              <SelectItem value="merge">Merge commit</SelectItem>
              <SelectItem value="rebase">Rebase</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {prs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No open pull requests touching{" "}
            <code className="font-mono text-xs">content/</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {prs.map((pr) => (
            <Card key={pr.number}>
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-primary hover:underline truncate"
                      >
                        {pr.title}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        #{pr.number}
                      </span>
                      {pr.draft && (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Image
                        src={pr.author.avatar}
                        alt={pr.author.login}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <a
                        href={pr.author.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {pr.author.login}
                      </a>
                      <span>·</span>
                      <span>
                        {pr.branch} → {pr.base}
                      </span>
                      <span>·</span>
                      <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performAction(pr.number, "close")}
                      disabled={isActing(pr.number)}
                    >
                      {acting?.prNumber === pr.number &&
                      acting.action === "close"
                        ? "Closing…"
                        : "Close"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => performAction(pr.number, "merge")}
                      disabled={isActing(pr.number) || pr.draft}
                      title={pr.draft ? "Cannot merge a draft PR" : undefined}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {acting?.prNumber === pr.number &&
                      acting.action === "merge"
                        ? "Merging…"
                        : "Merge"}
                    </Button>
                  </div>
                </div>

                {pr.body && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {pr.body}
                  </p>
                )}

                {/* Changed content files */}
                <div className="mt-3 rounded border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Content changes ({pr.contentFiles.length} of{" "}
                    {pr.totalFiles} files)
                  </p>
                  <ul className="flex flex-col gap-1">
                    {pr.contentFiles.map((f) => (
                      <li
                        key={f.filename}
                        className="flex items-center gap-2 text-xs font-mono"
                      >
                        <span
                          className={
                            f.status === "added"
                              ? "text-green-500"
                              : f.status === "removed"
                                ? "text-destructive"
                                : "text-yellow-500"
                          }
                        >
                          {f.status === "added"
                            ? "+"
                            : f.status === "removed"
                              ? "-"
                              : "~"}
                        </span>
                        <span className="text-foreground">{f.filename}</span>
                        <span className="text-muted-foreground">
                          +{f.additions} -{f.deletions}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
