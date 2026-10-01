import Link from "next/link";

// Catches /en/<missing> — rendered inside the docs Layout from
// app/[lang]/layout.tsx, so the navbar + sidebar are still visible.
export default function NotFoundInLocale() {
  return (
    <main className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold tracking-tight">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
        That docs page doesn&apos;t exist. Use the sidebar or search to find
        what you need.
      </p>
      <Link
        href="/en/introduction"
        className="mt-2 inline-flex items-center rounded border border-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600"
      >
        Back to home
      </Link>
    </main>
  );
}
