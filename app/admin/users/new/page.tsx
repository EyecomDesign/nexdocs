"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

    const data = (await res.json()) as { error?: string }
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
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Users
        </a>
        <h1 className="text-2xl font-semibold">Add User</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite a new user</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => v && set("role", v)}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "partner" && (
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canEdit}
                  onChange={(e) => set("canEdit", e.target.checked)}
                  className="rounded border-border"
                />
                Can edit documentation
              </label>
            )}

            <p className="text-xs text-muted-foreground">
              An invitation email will be sent so the user can set their password.
            </p>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving}>
                {saving ? "Sending invite…" : "Send invite"}
              </Button>
              <Button variant="outline" render={<a href="/admin/users" />}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
