import { NextRequest, NextResponse } from "next/server"

// App Router (Nextra 4) serves every page under /[lang]/… . The Pages-Router
// `i18n` config in next.config.ts is read by Nextra for page maps but is
// ignored by the App Router for routing, so a request without a locale prefix
// has no matching route and 404s. This middleware redirects un-prefixed paths
// to English and maps the retired German prefix to the same English path.
// The matcher excludes Next internals, Pagefind, the API, and paths containing
// a file extension (static assets).

const SUPPORTED_LOCALES = ["en"]
const LEGACY_LOCALES = ["de"]
const DEFAULT_LOCALE = "en"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const legacyPrefix = LEGACY_LOCALES.map((locale) => `/${locale}`).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (legacyPrefix) {
    const url = request.nextUrl.clone()
    url.pathname = `/${DEFAULT_LOCALE}${pathname.slice(legacyPrefix.length)}`
    return NextResponse.redirect(url)
  }

  const hasLocale = SUPPORTED_LOCALES.some(
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
