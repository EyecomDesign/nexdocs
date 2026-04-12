"use client"

import { useEffect, useState } from "react"

type Tier = "PUBLIC" | "PARTNER" | "ADMIN"
type RuleType = "page" | "section"

type VisibilityRecord = {
  path: string
  tier: Tier
  type: RuleType
}

const TIERS: Tier[] = ["PUBLIC", "PARTNER", "ADMIN"]
const TYPES: RuleType[] = ["page", "section"]

export default function VisibilityPage() {
  const [records, setRecords] = useState<VisibilityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // New-rule form state
  const [newPath, setNewPath] = useState("")
  const [newType, setNewType] = useState<RuleType>("page")
  const [newTier, setNewTier] = useState<Tier>("PUBLIC")
  const [addError, setAddError] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch("/api/admin/visibility")
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.data ?? [])
        setLoading(false)
      })
  }, [])

  async function updateTier(path: string, type: RuleType, tier: string) {
    setSaving(path)
    await fetch("/api/admin/visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type, tier }),
    })
    setRecords((prev) =>
      prev.map((r) => (r.path === path ? { ...r, tier: tier as Tier } : r)),
    )
    setSaving(null)
  }

  async function deleteRule(path: string, type: RuleType) {
    setSaving(path)
    await fetch("/api/admin/visibility", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type }),
    })
    setRecords((prev) => prev.filter((r) => r.path !== path))
    setSaving(null)
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")

    const trimmed = newPath.trim()
    if (!trimmed.startsWith("/")) {
      setAddError("Path must start with /")
      return
    }
    if (records.some((r) => r.path === trimmed)) {
      setAddError("A rule for this path already exists — edit it in the table below.")
      return
    }

    setAdding(true)
    const res = await fetch("/api/admin/visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: trimmed, type: newType, tier: newTier }),
    })
    setAdding(false)

    if (!res.ok) {
      setAddError("Failed to save rule.")
      return
    }

    setRecords((prev) =>
      [...prev, { path: trimmed, type: newType, tier: newTier }].sort((a, b) =>
        a.path.localeCompare(b.path),
      ),
    )
    setNewPath("")
    setNewType("page")
    setNewTier("PUBLIC")
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Visibility Settings
      </h1>

      {/* Add rule form */}
      <form
        onSubmit={addRule}
        className="mb-8 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
      >
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Add a visibility rule
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Path (e.g. /guides/internal)
            </label>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/path/to/page"
              required
              className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as RuleType)}
              className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Tier
            </label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as Tier)}
              className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add Rule"}
          </button>
        </div>
        {addError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{addError}</p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          <strong>Page</strong> — exact path match.&ensp;
          <strong>Section</strong> — applies to the path and all descendants.
        </p>
      </form>

      {/* Existing rules table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                Path
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                Tier
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {records.map((record) => (
              <tr
                key={record.path}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-200">
                  {record.path}
                </td>
                <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">
                  {record.type}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={record.tier}
                    disabled={saving === record.path}
                    onChange={(e) =>
                      updateTier(record.path, record.type, e.target.value)
                    }
                    className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteRule(record.path, record.type)}
                    disabled={saving === record.path}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No visibility rules set yet. All pages default to Public.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
