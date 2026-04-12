import { clerkClient } from "@clerk/nextjs/server"
import { auth } from "@clerk/nextjs/server"
import { isAdmin, extractMetadata } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"

export default async function UsersPage() {
  const { sessionClaims } = await auth()
  const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
  const userIsAdmin = isAdmin(metadata)

  const client = await clerkClient()
  const { data: users } = await client.users.getUserList({ limit: 100 })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        {userIsAdmin && (
          <Button render={<a href="/admin/users/new" />}>
            Add User
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {userIsAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleMeta =
                  (user.publicMetadata as { role?: string }).role ?? "—"
                const canEditFlag = (
                  user.publicMetadata as { canEdit?: boolean }
                ).canEdit
                const suspended = user.banned

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.emailAddresses[0]?.emailAddress ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {roleMeta}
                        {canEditFlag && " (editor)"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={suspended ? "destructive" : "default"}
                      >
                        {suspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    {userIsAdmin && (
                      <TableCell>
                        <form action="/api/admin/users" method="POST">
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />
                          <input
                            type="hidden"
                            name="action"
                            value={suspended ? "unsuspend" : "suspend"}
                          />
                          <button
                            type="submit"
                            className="text-xs text-amber-500 hover:underline"
                          >
                            {suspended ? "Unsuspend" : "Suspend"}
                          </button>
                        </form>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
