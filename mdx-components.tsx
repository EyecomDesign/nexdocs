import type { MDXComponents } from "nextra/mdx-components";
import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs";
import { CodeFile } from "@/components/docs/CodeFile";
import { ImageCard, ImageCardGrid } from "@/components/docs/ImageCard";

export function useMDXComponents(
  components: MDXComponents = {},
): MDXComponents {
  return {
    ...getDocsMDXComponents(components),
    CodeFile,
    ImageCard,
    ImageCardGrid,
    ...components,
  };
}
