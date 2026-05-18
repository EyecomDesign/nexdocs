import Link from "next/link"

// Catches /en/<missing>, /de/<missing> — rendered inside the docs Layout from
// app/[lang]/layout.tsx, so the navbar + sidebar are still visible.
export default function NotFoundInLocale() {
  return (
    <main className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="font-display text-6xl font-bold tracking-tight text-primary">404</p>
      <h1 className="font-display text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That docs page doesn&apos;t exist. Use the sidebar or search to find what you need.
      </p>
      <Link
        href="/en"
        className="mt-2 inline-flex items-center rounded border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
      >
        Back to home
      </Link>
    </main>
  )
}
