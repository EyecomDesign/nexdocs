"use client"

import { useEffect, useState } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

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

  const [newPath, setNewPath] = useState("")
  const [newType, setNewType] = useState<RuleType>("page")
  const [newTier, setNewTier] = useState<Tier>("PUBLIC")
  const [addError, setAddError] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch("/api/admin/visibility")
      .then((r) => r.json() as Promise<{ data?: VisibilityRecord[] }>)
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
    return <p className="text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Visibility Settings</h1>

      {/* Add rule form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a visibility rule</CardTitle>
          <CardDescription>
            <strong>Page</strong> — exact path match.{" "}
            <strong>Section</strong> — applies to the path and all descendants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addRule} className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48 flex flex-col gap-1.5">
                <Label htmlFor="newPath">Path (e.g. /guides/internal)</Label>
                <Input
                  id="newPath"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/path/to/page"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as RuleType)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tier</Label>
                <Select
                  value={newTier}
                  onValueChange={(v) => setNewTier(v as Tier)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add Rule"}
              </Button>
            </div>

            {addError && (
              <p className="text-xs text-destructive">{addError}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Existing rules table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.path}>
                  <TableCell className="font-mono text-sm">
                    {record.path}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {record.type}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={record.tier}
                      disabled={saving === record.path}
                      onValueChange={(v) =>
                        v && updateTier(record.path, record.type, v)
                      }
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0) + t.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => deleteRule(record.path, record.type)}
                      disabled={saving === record.path}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No visibility rules set yet. All pages default to Public.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
