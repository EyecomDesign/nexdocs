import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveVisibility } from "@/lib/visibility"
import { meetsVisibilityTier, canEdit, extractMetadata } from "@/lib/auth"

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth()
  const pathname = req.nextUrl.pathname

  // Admin routes require a valid session with canEdit permission
  if (pathname.startsWith("/admin")) {
    if (!userId) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
    if (!canEdit(metadata)) {
      return new NextResponse(null, { status: 404 })
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

  const metadata = extractMetadata(sessionClaims as Record<string, unknown>)

  if (!meetsVisibilityTier(metadata, tier)) {
    // Return 404 — do not confirm that protected content exists
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals, static files, health endpoint
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
