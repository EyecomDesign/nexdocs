export type UserRole = "partner" | "admin"

export type NexDocsMetadata = {
  role?: UserRole
  canEdit?: boolean
}

type VisibilityTier = "PUBLIC" | "PARTNER" | "ADMIN"

export function isAdmin(metadata: NexDocsMetadata): boolean {
  return metadata.role === "admin"
}

export function isPartner(metadata: NexDocsMetadata): boolean {
  return metadata.role === "partner"
}

export function canEdit(metadata: NexDocsMetadata): boolean {
  return isAdmin(metadata) || (isPartner(metadata) && metadata.canEdit === true)
}

export function meetsVisibilityTier(
  metadata: NexDocsMetadata | null,
  tier: VisibilityTier,
): boolean {
  if (tier === "PUBLIC") return true
  if (!metadata) return false
  if (tier === "PARTNER") return isPartner(metadata) || isAdmin(metadata)
  if (tier === "ADMIN") return isAdmin(metadata)
  return false
}

/** Extract our typed metadata from Clerk sessionClaims */
export function extractMetadata(
  sessionClaims: Record<string, unknown> | null | undefined,
): NexDocsMetadata {
  const raw = (sessionClaims?.metadata ?? {}) as Record<string, unknown>
  return {
    role: (raw.role as UserRole) ?? undefined,
    canEdit: typeof raw.canEdit === "boolean" ? raw.canEdit : undefined,
  }
}
