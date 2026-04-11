import type { ReactNode } from "react"

type CalloutType = "info" | "warning" | "error" | "tip"

const styles: Record<CalloutType, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200",
  tip: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200",
}

const icons: Record<CalloutType, string> = {
  info: "ℹ",
  warning: "⚠",
  error: "✖",
  tip: "✦",
}

export function Callout({
  type = "info",
  children,
}: {
  type?: CalloutType
  children: ReactNode
}) {
  return (
    <div className={`my-4 flex gap-3 rounded-lg border p-4 text-sm ${styles[type]}`}>
      <span className="shrink-0 select-none font-bold">{icons[type]}</span>
      <div>{children}</div>
    </div>
  )
}
