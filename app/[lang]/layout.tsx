import type { Metadata } from "next"
import { Syne, Outfit, Geist_Mono } from "next/font/google"
import { notFound } from "next/navigation"
import { Footer, Layout, Navbar } from "nextra-theme-docs"
import { Head } from "nextra/components"
import { getPageMap } from "nextra/page-map"
import "nextra-theme-docs/style.css"
import "../globals.css"

const LOCALES = new Set(["en", "de"])

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "NexDocs",
  description: "Official documentation for the Nexor bot",
  robots: { index: false, follow: false },
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  // [lang] is a dynamic segment that matches any value at runtime. Bail out
  // early for anything that isn't a real locale — otherwise getPageMap() throws
  // and turns a should-be-404 (e.g. /gitbook-assets/missing.png, /random-page)
  // into a 500.
  if (!LOCALES.has(lang)) notFound()
  const pageMap = await getPageMap(`/${lang}`)

  return (
    <html
      lang={lang}
      dir="ltr"
      suppressHydrationWarning
      className={`dark ${syne.variable} ${outfit.variable} ${geistMono.variable}`}
    >
      <Head />
      <body>
        <Layout
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/EyecomDesign/nexdocs/tree/master/content"
          i18n={[
            { locale: "en", name: "English" },
            { locale: "de", name: "Deutsch" },
          ]}
          navbar={<Navbar logo={<span className="font-semibold">NexDocs</span>} />}
          footer={
            <Footer>
              MIT {new Date().getFullYear()} © Nexor
            </Footer>
          }
          sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
          navigation={{ prev: true, next: true }}
          darkMode={false}
          nextThemes={{ forcedTheme: "dark" }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
