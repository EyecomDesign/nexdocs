import { generateStaticParamsFor, importPage } from "nextra/pages"
import { useMDXComponents } from "@/mdx-components"
import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { extractMetadata, meetsVisibilityTier } from "@/lib/auth"
import { resolveVisibility } from "@/lib/visibility"

export const dynamic = "force-dynamic"

export const generateStaticParams = generateStaticParamsFor("mdxPath")

export async function generateMetadata(props: {
  params: Promise<{ mdxPath?: string[] }>
}) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath)
  return metadata
}

const Wrapper = useMDXComponents().wrapper as React.ComponentType<{
  toc: unknown
  metadata: unknown
  sourceCode: string
  children: React.ReactNode
}>

export default async function Page(props: {
  params: Promise<{ mdxPath?: string[] }>
}) {
  const params = await props.params
  const pathname = "/" + (params.mdxPath?.join("/") ?? "")

  // Enforce visibility tier — PUBLIC pages skip auth entirely for performance
  const tier = await resolveVisibility(pathname)
  if (tier !== "PUBLIC") {
    const { userId, sessionClaims } = await auth()
    if (!userId) {
      redirect("/login")
    }
    const metadata = extractMetadata(sessionClaims as Record<string, unknown>)
    if (!meetsVisibilityTier(metadata, tier)) {
      notFound()
    }
  }

  const result = await importPage(params.mdxPath)
  const { default: MDXContent, toc, metadata, sourceCode } = result
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
