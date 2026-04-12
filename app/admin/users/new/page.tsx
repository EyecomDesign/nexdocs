"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewUserPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "partner" as "partner" | "admin",
    canEdit: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? "Failed to create user.")
      return
    }

    router.push("/admin/users")
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <a
          href="/admin/users"
          className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← Users
        </a>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Add User
        </h1>
      </div>

      <form
        onSubmit={submit}
        className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              First name
            </label>
            <input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Last name
            </label>
            <input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Role
          </label>
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="partner">Partner</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {form.role === "partner" && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.canEdit}
              onChange={(e) => set("canEdit", e.target.checked)}
              className="rounded border-gray-300"
            />
            Can edit documentation
          </label>
        )}

        <p className="text-xs text-gray-400">
          An invitation email will be sent so the user can set their password.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Sending invite…" : "Send invite"}
          </button>
          <a
            href="/admin/users"
            className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
