import Link from "next/link";
import "./globals.css";

// Catches any path outside the [lang] segment (e.g. /random, /gitbook-assets/missing.png).
// Required because the root layout doesn't render <html>/<body> — we have to provide
// them here ourselves, otherwise Next.js falls through to the locale-aware catch-all
// and Nextra throws 'Cannot use in operator to search for data in undefined'.
export default function NotFound() {
  return (
    <html lang="en" dir="ltr">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-6xl font-bold tracking-tight">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="max-w-sm text-sm text-gray-600">
            That page doesn&apos;t exist (or moved). Try the docs home.
          </p>
          <Link
            href="/en/introduction"
            className="mt-2 inline-flex items-center rounded border border-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:border-gray-400"
          >
            Go to docs home
          </Link>
        </main>
      </body>
    </html>
  );
}
