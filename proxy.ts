import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Note: Prisma (and Node crypto) cannot run in Edge Runtime.
// Visibility tier enforcement is handled by individual pages/layouts.
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth()
  const pathname = req.nextUrl.pathname

  // Admin UI: require login — layout enforces role checks via currentUser()
  if (pathname.startsWith("/admin")) {
    if (!userId) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Admin API: require login — route handlers enforce role checks
  if (pathname.startsWith("/api/admin")) {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // All other routes pass through — pages enforce visibility tier access
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals, static files, health endpoint
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
