import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const componentPath = path.resolve("components/docs/CodeFile.tsx");
const componentRequire = createRequire(componentPath);
const compiled = ts.transpileModule(readFileSync(componentPath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    resolveJsonModule: true,
  },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  process: { cwd: () => "/bundle" },
  require(name) {
    if (name === "node:fs") {
      return {
        readFileSync() {
          throw Object.assign(
            new Error(
              "ENOENT: build-time public files are absent in the Worker",
            ),
            { code: "ENOENT" },
          );
        },
      };
    }
    return componentRequire(name);
  },
});

function displayed(figure) {
  return figure.props.children[1].props.children.props.children;
}

test("complete source renders without build-machine files", () => {
  const source = readFileSync(
    "public/rotation-authoring/Warlock_TBC_Authoring_Tutorial.lua",
    "utf8",
  ).replace(/\r\n/g, "\n");
  assert.equal(
    displayed(exports.CodeFile({ path: "Warlock_TBC_Authoring_Tutorial.lua" })),
    source,
  );
});

test("checkpoint slices keep their line range and caption without filesystem access", () => {
  const source = readFileSync(
    "public/rotation-authoring/stages/03-skeleton.lua",
    "utf8",
  ).replace(/\r\n/g, "\n");
  const figure = exports.CodeFile({
    path: "stages/03-skeleton.lua",
    startLine: 2,
    endLine: 5,
  });
  assert.equal(displayed(figure), source.split("\n").slice(1, 5).join("\n"));
  assert.match(figure.props.children[0].props.children, /lines 2-5/);
});

test("unlisted, absolute, and parent paths are rejected", () => {
  for (const file of ["missing.lua", "../package.json", "/package.json"]) {
    assert.throws(() => exports.CodeFile({ path: file }));
  }
});
