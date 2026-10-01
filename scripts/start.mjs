import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

await mkdir(path.join(standaloneRoot, "public"), { recursive: true });
await cp(
  path.join(projectRoot, "public"),
  path.join(standaloneRoot, "public"),
  {
    recursive: true,
    force: true,
  },
);

await mkdir(path.join(standaloneRoot, ".next", "static"), { recursive: true });
await cp(
  path.join(projectRoot, ".next", "static"),
  path.join(standaloneRoot, ".next", "static"),
  { recursive: true, force: true },
);

const server = spawn(process.execPath, ["server.js"], {
  cwd: standaloneRoot,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.kill(signal));
}

server.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
