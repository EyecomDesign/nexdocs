"use client"

import { useEffect, useState } from "react"

type VisibilityRecord = {
  path: string
  tier: "PUBLIC" | "PARTNER" | "ADMIN"
  type: "page" | "section"
}

export default function VisibilityPage() {
  const [records, setRecords] = useState<VisibilityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/visibility")
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.data ?? [])
        setLoading(false)
      })
  }, [])

  async function updateTier(path: string, type: "page" | "section", tier: string) {
    setSaving(path)
    await fetch("/api/admin/visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type, tier }),
    })
    setRecords((prev) =>
      prev.map((r) =>
        r.path === path ? { ...r, tier: tier as VisibilityRecord["tier"] } : r,
      ),
    )
    setSaving(null)
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Visibility Settings
      </h1>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Path</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {records.map((record) => (
              <tr key={record.path} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
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
                    <option value="PUBLIC">Public</option>
                    <option value="PARTNER">Partner</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
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
