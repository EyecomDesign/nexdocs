import { Footer, Layout, Navbar } from "nextra-theme-docs"
import { getPageMap } from "nextra/page-map"
import "nextra-theme-docs/style.css"

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pageMap = await getPageMap()

  return (
    <Layout
      pageMap={pageMap}
      docsRepositoryBase="https://github.com/EyecomDesign/nexdocs/tree/master/content"
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
  )
}
