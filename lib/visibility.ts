type VisibilityTier = "PUBLIC" | "PARTNER" | "ADMIN"

// Visibility lookups are stubbed until auth/DB are wired up. Every page is
// treated as PUBLIC so the docs renderer doesn't need a database binding.
export async function resolveVisibility(
  _pathname: string,
): Promise<VisibilityTier> {
  return "PUBLIC"
}
