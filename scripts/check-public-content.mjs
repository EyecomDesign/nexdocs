import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const credentialName = "(?:[a-z][a-z0-9_-]*[_-])?(?:password|passphrase|secret|api[_-]?key|access[_-]?token|admin[_-]?token|connection[_-]?token|private[_-]?key)";
const assignment = new RegExp("\\b" + credentialName + "\\b[\\x60*\"']*\\s*[:=]\\s*(\"[^\"]*\"|'[^']*'|\\$\\{[^}]+\\}|[^\\s,;}|]+)", "gi");
const credentialField = new RegExp("^(?:" + credentialName + ")$", "i");
const inventoryField = /^(?:ssh[ _-]*(?:host|user(?:name)?|port)|vps[ _-]*(?:host|ip|address)|origin[ _-]*(?:host|ip|address)|(?:administrator|admin)[ _-]*(?:user|login)|host|username|ip(?:[ _-]*address)?)$/i;
const textExtensions = new Set([".md", ".mdx", ".txt", ".json", ".lua", ".csv", ".tsv", ".html", ".css", ".js", ".mjs", ".ts", ".tsx", ".yml", ".yaml", ".xml", ".svg"]);

function placeholder(raw) {
  const code = raw.trim().replace(/^\x60+|\x60+$/g, "");
  const quoted = /^["']/.test(code);
  const value = code.replace(/^["']|["']$/g, "").trim();
  if (!value || /^<[^<>]+>$/.test(value) || /^(?:REDACTED|YOUR_[A-Z_]+)$/.test(value)) return true;
  if (quoted) return false;
  return /^(?:string|number|boolean|null|nil|undefined)$/.test(value)
    || /^\$(?:[A-Z_][A-Z0-9_]*|\{[A-Z_][A-Z0-9_]*\}|env:[A-Z_][A-Z0-9_]*)$/.test(value)
    || /^process\.env\.[A-Z_][A-Z0-9_]*$/.test(value);
}

function publicExampleAddress(address) {
  const parts = address.split(".").map(Number);
  return parts.some(n => n > 255)
    || parts[0] === 127
    || address === "0.0.0.0"
    || address.startsWith("192.0.2.")
    || address.startsWith("198.51.100.")
    || address.startsWith("203.0.113.");
}

function publicationInstruction(line) {
  return line.split(/[;!?]|\.\s+/).some(clause => {
    const positive = clause.replace(/\b(?:never|do not|don't|must not|avoid)\s+(?:write|put|store|record|update|add|publish)\b/gi, "");
    return /\b(?:write|put|store|record|update|add|publish)\b/i.test(positive)
      && /\b(?:passwords?|tokens?|secrets?|credentials?)\b/i.test(positive)
      && /(?:access\.mdx|\bpublic\b.{0,30}\b(?:docs|documentation|page)|\bthis (?:page|document))/i.test(positive);
  });
}

export function scanText(text, file) {
  const findings = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const rules = new Set();
    for (const match of line.matchAll(assignment)) {
      if (!placeholder(match[1])) rules.add("credential-value");
    }
    if (/^\s*\|/.test(line)) {
      const cells = line.split("|").slice(1).map(cell => cell.replace(/[\x60*]/g, "").trim());
      if (credentialField.test(cells[0]) && !placeholder(cells[1] ?? "")) rules.add("credential-value");
      if (inventoryField.test(cells[0]) && !placeholder(cells[1] ?? "")) rules.add("operator-inventory");
    }
    for (const match of line.matchAll(/https?:\/\/([^\s/?#<>]+)@/gi)) {
      if (!match[1].split(":").every(placeholder)) rules.add("credential-url");
    }
    for (const match of line.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
      if (!publicExampleAddress(match[0])) rules.add("host-address");
    }
    const login = line.match(/\b(?:ssh|scp|sftp|rsync)\b[^\r\n]*?([^\s]+@[^\s]+)/i);
    if (login && !login[1].split("@").every(placeholder)) rules.add("operator-login");
    for (const match of line.matchAll(/(?:[A-Z]:[\\/]+Users[\\/]+|\/home\/)([^\\/\s]+)/gi)) {
      if (!placeholder(match[1])) rules.add("private-home-path");
    }
    if (/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/.test(line)) rules.add("private-key");
    if (publicationInstruction(line)) rules.add("credential-publication");
    for (const rule of rules) findings.push({ file, line: index + 1, rule });
  }
  return findings;
}

export function scanPublished(root) {
  const source = path.join(root, "content", "en");
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error("Missing published documentation directory");
  }
  const report = { filesChecked: 0, findings: [] };
  let documents = 0;
  function walk(directory, isSource) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(directory, entry.name);
      const file = path.relative(root, full).split(path.sep).join("/");
      if (entry.isSymbolicLink()) {
        report.findings.push({ file, line: 1, rule: "publication-symlink" });
      } else if (entry.isDirectory()) {
        walk(full, isSource);
      } else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
        if (isSource && /\.mdx?$/i.test(entry.name)) documents++;
        report.filesChecked++;
        report.findings.push(...scanText(fs.readFileSync(full, "utf8"), file));
      }
    }
  }
  walk(source, true);
  const publicRoot = path.join(root, "public");
  if (fs.existsSync(publicRoot)) walk(publicRoot, false);
  if (documents === 0) throw new Error("No published documentation found");
  return report;
}

function main(args) {
  if (args.length !== 0 && !(args.length === 2 && args[0] === "--root")) {
    console.error("Usage: node scripts/check-public-content.mjs [--root directory]");
    return 2;
  }
  try {
    const report = scanPublished(path.resolve(args[1] ?? process.cwd()));
    for (const item of report.findings) {
      console.error(item.file + ":" + item.line + " [" + item.rule + "]");
    }
    console.log(report.filesChecked + " published text files checked.");
    return report.findings.length ? 1 : 0;
  } catch {
    console.error("Public content check could not read the published documentation.");
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}

