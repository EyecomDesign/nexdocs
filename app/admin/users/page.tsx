import { clerkClient } from "@clerk/nextjs/server"
import { auth } from "@clerk/nextjs/server"
import { isAdmin, extractMetadata } from "@/lib/auth"

export default async function UsersPage() {
  const { sessionClaims } = await auth()
  const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
  const userIsAdmin = isAdmin(metadata)

  const client = await clerkClient()
  const { data: users } = await client.users.getUserList({ limit: 100 })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Users
        </h1>
        {userIsAdmin && (
          <a
            href="/admin/users/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add User
          </a>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
              {userIsAdmin && (
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((user) => {
              const roleMeta = (user.publicMetadata as { role?: string }).role ?? "—"
              const canEditFlag = (user.publicMetadata as { canEdit?: boolean }).canEdit
              const suspended = user.banned

              return (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {user.emailAddresses[0]?.emailAddress ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {roleMeta}
                      {canEditFlag && " (editor)"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        suspended
                          ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      }`}
                    >
                      {suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  {userIsAdmin && (
                    <td className="px-4 py-3 flex gap-2">
                      <form action="/api/admin/users" method="POST">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="action" value={suspended ? "unsuspend" : "suspend"} />
                        <button
                          type="submit"
                          className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                        >
                          {suspended ? "Unsuspend" : "Suspend"}
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
