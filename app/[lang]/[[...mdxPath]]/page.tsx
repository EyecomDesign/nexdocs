import { generateStaticParamsFor, importPage } from "nextra/pages"
import { useMDXComponents } from "@/mdx-components"

export const generateStaticParams = generateStaticParamsFor("mdxPath")

type PageProps = {
  params: Promise<{ mdxPath?: string[]; lang: string }>
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath, params.lang)
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
  const result = await importPage(params.mdxPath, params.lang)
  const { default: MDXContent, toc, metadata, sourceCode } = result
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
