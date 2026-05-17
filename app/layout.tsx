import type { ReactNode } from "react"

// The real <html> / <body> live in `app/[lang]/layout.tsx` so we can drive
// the document language from the route segment. This root layout just passes
// children through.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
