import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(
  new URL("../public/rotation-authoring/", import.meta.url),
);
const output = fileURLToPath(
  new URL("../components/docs/code-sources.generated.json", import.meta.url),
);
const sources = {};

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collect(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".lua")) {
      const key = path.relative(root, fullPath).split(path.sep).join("/");
      sources[key] = readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n");
    }
  }
}

collect(root);
const generated = JSON.stringify(sources, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8").replace(/\r\n/g, "\n") !== generated) {
    throw new Error(
      "Embedded course sources are stale. Run node scripts/generate-code-sources.mjs.",
    );
  }
} else {
  writeFileSync(output, generated);
}
console.log(
  `Embedded course sources: ${Object.keys(sources).length} files verified.`,
);
