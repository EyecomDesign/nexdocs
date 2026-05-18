import { notFound } from "next/navigation"
import { generateStaticParamsFor, importPage } from "nextra/pages"
import { useMDXComponents } from "@/mdx-components"

const LOCALES = new Set(["en", "de"])

export const generateStaticParams = generateStaticParamsFor("mdxPath")

type PageProps = {
  params: Promise<{ mdxPath?: string[]; lang: string }>
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params
  // generateMetadata runs before the layout, so we need the same locale guard
  // here — otherwise importPage() throws on bogus lang values from
  // unmatched paths (e.g. /gitbook-assets/x, /totally-random) and the
  // response becomes 500 instead of the layout's notFound() → 404.
  if (!LOCALES.has(params.lang)) return {}
  const { metadata } = await importPage(params.mdxPath ?? [], params.lang)
  return metadata
}

const Wrapper = useMDXComponents().wrapper as React.ComponentType<{
  toc: unknown
  metadata: unknown
  sourceCode: string
  children: React.ReactNode
}>

export default async function Page(props: PageProps) {
  const params = await props.params
  if (!LOCALES.has(params.lang)) notFound()
  const result = await importPage(params.mdxPath ?? [], params.lang)
  const { default: MDXContent, toc, metadata, sourceCode } = result
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
