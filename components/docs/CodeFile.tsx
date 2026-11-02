import sources from "./code-sources.generated.json";

type CodeFileProps = {
  path: string;
  language?: string;
  startLine?: number;
  endLine?: number;
};

export function CodeFile({
  path: repositoryPath,
  language = "lua",
  startLine,
  endLine,
}: CodeFileProps) {
  // Course sources are bundled at build time; Workers has no build-machine public directory.
  if (!Object.prototype.hasOwnProperty.call(sources, repositoryPath)) {
    throw new Error(
      `CodeFile path is not an embedded course source: ${repositoryPath}`,
    );
  }

  const source = (sources as Record<string, string>)[repositoryPath];
  const lines = source.split("\n");
  const first = Math.max(1, startLine ?? 1);
  const last = Math.min(lines.length, endLine ?? lines.length);
  const displayed = lines.slice(first - 1, last).join("\n");
  const caption =
    first === 1 && last === lines.length
      ? `rotation-authoring/${repositoryPath}`
      : `rotation-authoring/${repositoryPath} (lines ${first}-${last})`;

  return (
    <figure className="my-6">
      <figcaption className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        {caption}
      </figcaption>
      <pre data-language={language}>
        <code>{displayed}</code>
      </pre>
    </figure>
  );
}
