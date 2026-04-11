import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { canEdit, extractMetadata } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
  if (!canEdit(metadata)) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <span className="text-gray-900 dark:text-white font-semibold">
            NexDocs Admin
          </span>
          <a href="/admin/users" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Users
          </a>
          <a href="/admin/visibility" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Visibility
          </a>
          <a href="/" className="ml-auto text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            ← Back to Docs
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
