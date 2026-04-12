import { Footer, Layout, Navbar } from "nextra-theme-docs"
import { getPageMap } from "nextra/page-map"
import type { PageMapItem } from "nextra"
import "nextra-theme-docs/style.css"
import { NavbarAuthButton } from "@/components/docs/NavbarAuthButton"
import { UnauthorizedBanner } from "@/components/docs/UnauthorizedBanner"
import { Suspense } from "react"

// Routes that exist as Next.js app pages but should NOT appear in the docs sidebar
const EXCLUDED_ROUTES = new Set(["/admin", "/login", "/invite"])

function filterPageMap(items: PageMapItem[]): PageMapItem[] {
  return items.filter((item) => {
    const route = "route" in item ? (item.route as string) : ""
    // Exclude admin, auth, and any sub-routes of excluded paths
    return !EXCLUDED_ROUTES.has(route) &&
      ![...EXCLUDED_ROUTES].some((r) => route.startsWith(r + "/"))
  })
}

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const rawPageMap = await getPageMap()
  const pageMap = filterPageMap(rawPageMap)

  return (
    <Layout
      pageMap={pageMap}
      docsRepositoryBase="https://github.com/your-org/nexdocs/tree/main/content"
      navbar={
        <Navbar logo={<span className="font-semibold">NexDocs</span>}>
          <NavbarAuthButton />
        </Navbar>
      }
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
      <Suspense>
        <UnauthorizedBanner />
      </Suspense>
    </Layout>
  )
}
