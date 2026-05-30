import { NextRequest, NextResponse } from "next/server"

// App Router (Nextra 4) serves every page under /[lang]/… . The Pages-Router
// `i18n` config in next.config.ts is read by Nextra for page maps but is
// ignored by the App Router for routing, so a request without a locale prefix
// (e.g. /profile-creator/questing-profiles) has no matching route and 404s.
// This middleware redirects any un-prefixed path to the default locale so that
// shared/typed links resolve. The matcher below excludes Next internals,
// Pagefind, the API, and any path containing a file extension (static assets).

const LOCALES = ["en", "de"]
const DEFAULT_LOCALE = "en"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
  if (hasLocale) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/|_pagefind/|api/|.*\\.).*)"],
}
