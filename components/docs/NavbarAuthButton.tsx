"use client"

import { useUser, UserButton } from "@clerk/nextjs"

export function NavbarAuthButton() {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) {
    return <div className="h-8 w-8" />
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
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
    >
      Login
    </a>
  )
}
