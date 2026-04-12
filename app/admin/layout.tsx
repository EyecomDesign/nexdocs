import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { canEdit } from "@/lib/auth"
import type { NexDocsMetadata } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) redirect("/login")

  const metadata: NexDocsMetadata = {
    role: (user.publicMetadata?.role as NexDocsMetadata["role"]) ?? undefined,
    canEdit:
      typeof user.publicMetadata?.canEdit === "boolean"
        ? user.publicMetadata.canEdit
        : undefined,
  }

  if (!canEdit(metadata)) redirect("/?unauthorized=1")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Amber accent bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <header className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3.5">
        <nav className="flex items-center gap-5 text-sm">
          <span className="font-[family-name:var(--font-syne)] font-semibold tracking-tight text-foreground text-base">
            NexDocs
            <span className="ml-1.5 text-xs font-normal text-primary opacity-80">
              admin
            </span>
          </span>

          <div className="h-4 w-px bg-border" />

          {[
            { href: "/admin/users", label: "Users" },
            { href: "/admin/visibility", label: "Visibility" },
            { href: "/admin/prs", label: "Pull Requests" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              {label}
            </a>
          ))}

          <a
            href="/"
            className="ml-auto text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-1.5"
          >
            <span className="text-primary/60">←</span> Docs
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
