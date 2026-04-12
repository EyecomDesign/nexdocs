"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

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
        if (d.error) {
          setError(d.error)
        } else {
          setPrs(d.data ?? [])
        }
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

  const isActing = (prNumber: number) =>
    acting?.prNumber === prNumber

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading pull requests…</p>
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Pull Requests
        </h1>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Pull Requests
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500 dark:text-gray-400">Merge method:</label>
          <select
            value={mergeMethod}
            onChange={(e) =>
              setMergeMethod(e.target.value as "merge" | "squash" | "rebase")
            }
            className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="squash">Squash</option>
            <option value="merge">Merge commit</option>
            <option value="rebase">Rebase</option>
          </select>
        </div>
      </div>

      {prs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center text-gray-400">
          No open pull requests touching <code className="font-mono text-xs">content/</code>.
        </div>
      ) : (
        <div className="space-y-4">
          {prs.map((pr) => (
            <div
              key={pr.number}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-blue-600 hover:underline dark:text-blue-400 truncate"
                    >
                      {pr.title}
                    </a>
                    <span className="text-xs text-gray-400">#{pr.number}</span>
                    {pr.draft && (
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Draft
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
                  <button
                    onClick={() => performAction(pr.number, "close")}
                    disabled={isActing(pr.number)}
                    className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {acting?.prNumber === pr.number && acting.action === "close"
                      ? "Closing…"
                      : "Close"}
                  </button>
                  <button
                    onClick={() => performAction(pr.number, "merge")}
                    disabled={isActing(pr.number) || pr.draft}
                    title={pr.draft ? "Cannot merge a draft PR" : undefined}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {acting?.prNumber === pr.number && acting.action === "merge"
                      ? "Merging…"
                      : "Merge"}
                  </button>
                </div>
              </div>

              {/* PR body */}
              {pr.body && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">
                  {pr.body}
                </p>
              )}

              {/* Changed content files */}
              <div className="mt-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Content changes ({pr.contentFiles.length} of {pr.totalFiles} files)
                </p>
                <ul className="space-y-1">
                  {pr.contentFiles.map((f) => (
                    <li
                      key={f.filename}
                      className="flex items-center gap-2 text-xs font-mono"
                    >
                      <span
                        className={
                          f.status === "added"
                            ? "text-green-600 dark:text-green-400"
                            : f.status === "removed"
                              ? "text-red-500 dark:text-red-400"
                              : "text-yellow-600 dark:text-yellow-400"
                        }
                      >
                        {f.status === "added" ? "+" : f.status === "removed" ? "-" : "~"}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{f.filename}</span>
                      <span className="text-gray-400">
                        +{f.additions} -{f.deletions}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
