import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isAdmin, extractMetadata } from "@/lib/auth"

const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["partner", "admin"]),
  canEdit: z.boolean().default(false),
  password: z.string().min(8).optional(),
})

const UpdateUserSchema = z.object({
  userId: z.string(),
  action: z.enum(["suspend", "unsuspend", "updateRole"]),
  role: z.enum(["partner", "admin"]).optional(),
  canEdit: z.boolean().optional(),
})

async function requireAdmin() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
  return isAdmin(metadata) ? userId : null
}

export async function POST(request: Request) {
  const adminId = await requireAdmin()
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, firstName, lastName, role, canEdit, password } = parsed.data
  const client = await clerkClient()

  try {
    const user = await client.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password,
      publicMetadata: { role, canEdit },
      skipPasswordChecks: false,
    })

    // If no password, send an invitation email
    if (!password) {
      await client.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: { role, canEdit },
      })
    }

    return NextResponse.json({ data: { id: user.id } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const adminId = await requireAdmin()
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { userId, action, role, canEdit } = parsed.data
  const client = await clerkClient()

  try {
    if (action === "suspend") {
      await client.users.banUser(userId)
    } else if (action === "unsuspend") {
      await client.users.unbanUser(userId)
    } else if (action === "updateRole") {
      const existing = await client.users.getUser(userId)
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...existing.publicMetadata,
          ...(role !== undefined && { role }),
          ...(canEdit !== undefined && { canEdit }),
        },
      })
    }

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
