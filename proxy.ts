import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveVisibility } from "@/lib/visibility"
// Role checks are done server-side via currentUser() — not in middleware

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth()
  const pathname = req.nextUrl.pathname

  // Admin routes: require login only — the layout fetches fresh user data via currentUser()
  // (JWT session claims don't include publicMetadata by default in Clerk 7)
  if (pathname.startsWith("/admin")) {
    if (!userId) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Resolve visibility tier for docs and other content paths
  const tier = await resolveVisibility(pathname)

  if (tier === "PUBLIC") {
    return NextResponse.next()
  }

  // Require authentication for PARTNER and ADMIN tiers
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // For tier checks, use currentUser() isn't available in middleware —
  // fall back to passing through; the page itself will enforce access.
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals, static files, health endpoint
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
