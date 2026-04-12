/**
 * User seed script.
 *
 * Upserts users into a Clerk app and sets their publicMetadata (role, canEdit).
 * Safe to re-run — existing users are only updated, never duplicated.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_... npx tsx scripts/seed-users.ts
 *
 * Point CLERK_SECRET_KEY at whichever environment you want to seed:
 *   - Local:   sk_test_... from your local Clerk app
 *   - Staging: sk_test_... from your staging Clerk app
 *   - Prod:    sk_live_... from your production Clerk app
 */

import { createClerkClient } from "@clerk/backend"
import type { NexDocsMetadata, UserRole } from "../lib/auth"

// ─── Define users to seed ────────────────────────────────────────────────────

type SeedUser = {
  email: string
  password?: string // omit if the account uses social/SSO login
  firstName?: string
  lastName?: string
  metadata: NexDocsMetadata
}

const SEED_USERS: SeedUser[] = [
  {
    email: "justin_Gfrerer@hotmail.com", // replace with your actual admin email
    password: "Yamaha_8+8",       // set a password if creating fresh accounts
    firstName: "Justin",
    metadata: { role: "admin" as UserRole },
  },
  // Add more users here as needed:
  // {
  //   email: "partner@example.com",
  //   metadata: { role: "partner", canEdit: true },
  // },
]

// ─── Script ──────────────────────────────────────────────────────────────────

const secretKey = process.env.CLERK_SECRET_KEY
if (!secretKey) {
  console.error("[seed] ERROR: CLERK_SECRET_KEY is not set — aborting")
  process.exit(1)
}

const clerk = createClerkClient({ secretKey })

async function upsertUser(user: SeedUser) {
  const { email, password, firstName, lastName, metadata } = user

  // Check if user already exists
  const { data: existing } = await clerk.users.getUserList({
    emailAddress: [email],
  })

  if (existing.length > 0) {
    const found = existing[0]
    await clerk.users.updateUser(found.id, {
      publicMetadata: metadata as Record<string, unknown>,
    })
    console.log(`[seed] updated  ${email} → role: ${metadata.role ?? "none"}`)
    return
  }

  // Create new user
  const createParams: Parameters<typeof clerk.users.createUser>[0] = {
    emailAddress: [email],
    publicMetadata: metadata as Record<string, unknown>,
    skipPasswordChecks: false,
  }

  if (firstName) createParams.firstName = firstName
  if (lastName) createParams.lastName = lastName
  if (password) {
    createParams.password = password
  } else {
    // No password — Clerk will send an email invite if configured,
    // or the user can sign in via social/SSO
    createParams.skipPasswordChecks = true
  }

  await clerk.users.createUser(createParams)
  console.log(`[seed] created  ${email} → role: ${metadata.role ?? "none"}`)
}

async function main() {
  console.log(`[seed] Seeding ${SEED_USERS.length} user(s)...`)

  for (const user of SEED_USERS) {
    try {
      await upsertUser(user)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[seed] FAILED   ${user.email}: ${message}`)
    }
  }

  console.log("[seed] Done")
}

main().catch((err) => {
  console.error("[seed] FATAL:", err)
  process.exit(1)
})
