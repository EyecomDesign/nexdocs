import { readFileSync } from "node:fs"
import { isAbsolute, relative, resolve, sep } from "node:path"

type CodeFileProps = {
  path: string
  language?: string
  startLine?: number
  endLine?: number
}

const SOURCE_ROOT = resolve(process.cwd(), "public", "rotation-authoring")

export function CodeFile({ path: repositoryPath, language = "lua", startLine, endLine }: CodeFileProps) {
  const sourcePath = resolve(SOURCE_ROOT, repositoryPath)
  const relativePath = relative(SOURCE_ROOT, sourcePath)

  if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(".." + sep)) {
    throw new Error(`CodeFile path must stay inside public/rotation-authoring: ${repositoryPath}`)
  }

  const source = readFileSync(sourcePath, "utf8")
  const lines = source.split("\n")
  const first = Math.max(1, startLine ?? 1)
  const last = Math.min(lines.length, endLine ?? lines.length)
  const displayed = lines.slice(first - 1, last).join("\n")
  const caption = first === 1 && last === lines.length
    ? `rotation-authoring/${repositoryPath}`
    : `rotation-authoring/${repositoryPath} (lines ${first}-${last})`

  return (
    <figure className="my-6">
      <figcaption className="mb-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>
      <pre data-language={language}>
        <code>{displayed}</code>
      </pre>
    </figure>
  )
}
