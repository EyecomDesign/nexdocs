import { Geist_Mono, Outfit, Syne } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["300", "400", "500", "600"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

// Catches any path outside the [lang] segment (e.g. /random, /gitbook-assets/missing.png).
// Required because the root layout doesn't render <html>/<body> — we have to provide
// them here ourselves, otherwise Next.js falls through to the locale-aware catch-all
// and Nextra throws 'Cannot use in operator to search for data in undefined'.
export default function NotFound() {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`dark ${syne.variable} ${outfit.variable} ${geistMono.variable}`}
    >
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-display text-6xl font-bold tracking-tight text-primary">404</p>
          <h1 className="font-display text-2xl font-semibold">Page not found</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            That page doesn&apos;t exist (or moved). Try the docs home.
          </p>
          <Link
            href="/en"
            className="mt-2 inline-flex items-center rounded border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
          >
            Go to docs home
          </Link>
        </main>
      </body>
    </html>
  )
}
