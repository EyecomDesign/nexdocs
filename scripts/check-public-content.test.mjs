import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { scanText } from "./check-public-content.mjs";

const script = fileURLToPath(new URL("./check-public-content.mjs", import.meta.url));
const name = "content/en/example.mdx";
const finding = (rule, line = 1) => [{ file: name, line, rule }];

test("rejects an actual-looking credential assignment and reports the correct CRLF line", () => {
  assert.deepEqual(scanText("# Example\r\nDASHBOARD_PASSWORD = \"fixture-only-value\"\r\n", name), finding("credential-value", 2));
});
test("rejects a credential in a Markdown access table", () => {
  assert.deepEqual(scanText("| **Password** | fixture-only-value |", name), finding("credential-value"));
});
test("rejects a private SSH username in an operations inventory table", () => {
  assert.deepEqual(scanText("| SSH Username | fixture-operator |", name), finding("operator-inventory"));
});
test("rejects a quoted multiword credential instead of treating it as explanatory prose", () => {
  assert.deepEqual(scanText("password: \"fixture phrase for testing\"", name), finding("credential-value"));
});
test("rejects JSON access tokens", () => {
  assert.deepEqual(scanText('{"access_token": "fixture-only-value"}', name), finding("credential-value"));
});
test("accepts explanatory credential names and typed schema fields", () => {
  assert.deepEqual(scanText("Enter the AdminToken supplied privately.\nAdminToken: string\nThe config key is NexorWorldAPI-AdminToken.", name), []);
});
test("accepts placeholders, environment references and an empty credential assignment", () => {
  const text = ['PASSWORD="<your-password>"', 'API_KEY=$' + '{API_KEY}', "ACCESS_TOKEN=process.env.ACCESS_TOKEN", 'PASSWORD=""'].join("\n");
  assert.deepEqual(scanText(text, name), []);
});
test("rejects a credential-bearing URL even on an example domain", () => {
  assert.deepEqual(scanText("https://example-user:fixture-only-value@example.invalid/login", name), finding("credential-url"));
});
test("accepts a URL made entirely from explicit placeholders", () => {
  assert.deepEqual(scanText("https://<user>:<password>@example.invalid/login", name), []);
});
test("rejects literal origin addresses", () => {
  assert.deepEqual(scanText("Origin: 10.20.30.40", name), finding("host-address"));
});
test("accepts loopback, bind and documentation example addresses", () => {
  assert.deepEqual(scanText("127.0.0.1 0.0.0.0 192.0.2.10 198.51.100.10 203.0.113.10", name), []);
});
test("rejects an operator login in a shell command", () => {
  assert.deepEqual(scanText("ssh fixture-operator@ops.internal", name), finding("operator-login"));
});
test("accepts explicit operator-login placeholders", () => {
  assert.deepEqual(scanText("ssh <user>@<host>", name), []);
});
test("rejects private workstation home paths", () => {
  assert.deepEqual(scanText("C:\\Users\\fixture-operator\\scripts\n/home/fixture-operator/scripts", name), [
    { file: name, line: 1, rule: "private-home-path" },
    { file: name, line: 2, rule: "private-home-path" },
  ]);
});
test("accepts home path placeholders", () => {
  assert.deepEqual(scanText("C:\\Users\\<user>\\scripts\n/home/<user>/scripts", name), []);
});
test("rejects instructions to republish replacement credentials", () => {
  assert.deepEqual(scanText("Update access.mdx with the new password.", name), finding("credential-publication"));
});
test("accepts instructions to keep credentials private", () => {
  assert.deepEqual(scanText("Never publish passwords in public documentation.\nStore the replacement password in the approved private store.", name), []);
});
test("rejects private-key blocks", () => {
  assert.deepEqual(scanText("-----BEGIN PRIVATE KEY-----\nfixture-only-not-a-key\n-----END PRIVATE KEY-----", name), finding("private-key"));
});

function fixture(t, includeDocumentation = true) {
  const prefix = path.join(os.tmpdir(), "nexdocs-policy-test-");
  const root = fs.mkdtempSync(prefix);
  fs.mkdirSync(path.join(root, includeDocumentation ? "content/en" : "content"), { recursive: true });
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  if (includeDocumentation) fs.writeFileSync(path.join(root, "content/en/example.mdx"), "# Public example\n");
  t.after(() => {
    const target = path.resolve(root);
    if (target !== root || !target.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(target).startsWith("nexdocs-policy-test-")) {
      throw new Error("Unsafe test cleanup target");
    }
    fs.rmSync(target, { recursive: true, force: true });
  });
  return root;
}
function run(root, extra = []) {
  return spawnSync(process.execPath, [script, "--root", root, ...extra], { encoding: "utf8" });
}
test("CLI checks nested published docs and textual downloads and exits nonzero without exposing values", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "public/downloads"));
  const sentinel = "fixture-value-must-not-appear";
  fs.writeFileSync(path.join(root, "public/downloads/example.lua"), 'local API_KEY = "' + sentinel + '"\n');
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /public\/downloads\/example\.lua:1 \[credential-value\]/);
  assert.ok(!result.stdout.includes(sentinel) && !result.stderr.includes(sentinel));
});
test("CLI accepts a clean publication and excludes unpublished trees and binary downloads", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "content-de-disabled"));
  fs.writeFileSync(path.join(root, "content-de-disabled/old.mdx"), 'PASSWORD="fixture-only-value"');
  fs.writeFileSync(path.join(root, "public/image.png"), Buffer.from('PASSWORD="fixture-only-value"'));
  fs.writeFileSync(path.join(root, "public/example.lua"), "return {}\n");
  const result = run(root);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /2 published text files/);
  assert.equal(result.stderr, "");
});
test("CLI fails closed if the published documentation directory is missing", (t) => {
  const root = fixture(t, false);
  const result = run(root);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /published documentation/);
});
test("CLI rejects unknown options instead of bypassing its policy", (t) => {
  const root = fixture(t);
  assert.equal(run(root, ["--allow-all"]).status, 2);
});
test("CLI does not follow publication symlinks without review", (t) => {
  const root = fixture(t);
  const target = path.join(root, "unpublished");
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, "hidden.mdx"), "# Hidden");
  try {
    fs.symlinkSync(target, path.join(root, "public/linked"), "junction");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") return t.skip("Symlink creation unavailable on this host");
    throw error;
  }
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /public\/linked:1 \[publication-symlink\]/);
});

test("rejects credential URLs with only one component redacted", () => {
  for (const userinfo of ["<user>:fixture-only-value", "fixture-user:<password>", "<user>:fixture-only-value:<suffix>"]) {
    assert.deepEqual(scanText("https://" + userinfo + "@example.invalid/login", name), finding("credential-url"));
  }
});

test("CLI checks shell scripts, configuration files and unrecognized textual downloads", (t) => {
  const root = fixture(t);
  const sentinel = "fixture-value-must-not-appear";
  const names = ["config.env", "config.ini", "setup.sh", "setup.ps1", "unrecognized.download", "credentials"];
  for (const filename of names) fs.writeFileSync(path.join(root, "public", filename), 'PASSWORD="' + sentinel + '"\n');
  const result = run(root);
  assert.equal(result.status, 1);
  for (const filename of names) assert.ok(result.stderr.includes("public/" + filename + ":1 [credential-value]"));
  assert.ok(!result.stdout.includes(sentinel) && !result.stderr.includes(sentinel));
});

test("CLI excludes unknown binary formats from the textual publication scope", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "public/data.binary"), Buffer.from([0xff, 0x00, 0xfe]));
  const result = run(root);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /1 published text files/);
});

test("rejects credentials in Markdown table columns", () => {
  const text = "| User | Password |\n| --- | --- |\n| fixture-user | fixture-only-value |";
  assert.deepEqual(scanText(text, name), finding("credential-value", 3));
});

test("rejects private inventory in Markdown table columns without outer pipes", () => {
  const text = "Service | SSH Username\n--- | ---\nExample | fixture-operator";
  assert.deepEqual(scanText(text, name), finding("operator-inventory", 3));
});

test("rejects credentials in CSV and TSV table columns with quoted values", () => {
  for (const [file, separator] of [["public/access.csv", ","], ["public/access.csv", ";"], ["public/access.tsv", "\t"]]) {
    const text = ["User", "Password"].join(separator) + "\n" + ["fixture-user", '"fixture,value"'].join(separator);
    assert.deepEqual(scanText(text, file), [{ file, line: 2, rule: "credential-value" }]);
  }
});

test("accepts placeholder-only Markdown and CSV access tables", () => {
  assert.deepEqual(scanText("| User | Password |\n| --- | --- |\n| <user> | <password> |", name), []);
  assert.deepEqual(scanText("| Host | Password |\n| --- | --- |\n| localhost | <password> |", name), []);
  assert.deepEqual(scanText("Host,Password\nlocalhost,<password>", "public/access.csv"), []);
});

test("accepts development and documentation hosts in both table layouts", () => {
  for (const host of ["localhost", "localhost:3000", "127.0.0.1", "0.0.0.0", "192.0.2.10", "198.51.100.10", "203.0.113.10"]) {
    assert.deepEqual(scanText("| Host | " + host + " |", name), []);
    assert.deepEqual(scanText("| Service | Host |\n| --- | --- |\n| Example | " + host + " |", name), []);
  }
  assert.deepEqual(scanText("| Host | ops.internal |", name), finding("operator-inventory"));
});

