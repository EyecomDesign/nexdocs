"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"

export function UnauthorizedBanner() {
  const params = useSearchParams()
  const [dismissed, setDismissed] = useState(false)

  if (!params.get("unauthorized") || dismissed) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 max-w-sm">
      <span className="flex-1">
        You don&apos;t have access to that page. If you were recently granted
        admin access, <strong>sign out and sign back in</strong> to refresh your
        session.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
