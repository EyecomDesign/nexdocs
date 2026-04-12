"use client"

import { useUser, UserButton } from "@clerk/nextjs"

export function NavbarAuthButton() {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) {
    return <div className="size-8" />
  }

  if (isSignedIn) {
    const role = (user.publicMetadata as { role?: string }).role
    const canEdit =
      role === "admin" ||
      (role === "partner" &&
        (user.publicMetadata as { canEdit?: boolean }).canEdit === true)

    return (
      <div className="flex items-center gap-3">
        {canEdit && (
          <a
            href="/admin"
            className="rounded px-3 py-1.5 text-xs font-medium font-[family-name:var(--font-syne)] tracking-wide text-muted-foreground border border-border hover:border-primary/40 hover:text-primary transition-colors duration-150"
          >
            Admin
          </a>
        )}
        <UserButton />
      </div>
    )
  }

  return (
    <a
      href="/login"
      className="rounded px-3 py-1.5 text-xs font-medium font-[family-name:var(--font-syne)] tracking-wide bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
    >
      Sign in
    </a>
  )
}
