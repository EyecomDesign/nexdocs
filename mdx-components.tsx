import type { MDXComponents } from "nextra/mdx-components"
import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs"
import { CodeFile } from "@/components/docs/CodeFile"

export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    ...getDocsMDXComponents(components),
    CodeFile,
    ...components,
  }
}
