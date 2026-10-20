import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";

const credentialName = "(?:[a-z][a-z0-9_-]*[_-])?(?:password|passphrase|secret|api[_-]?key|access[_-]?token|admin[_-]?token|connection[_-]?token|private[_-]?key)";
const assignment = new RegExp("\\b" + credentialName + "\\b[\\x60*\"']*\\s*[:=]\\s*(\"[^\"]*\"|'[^']*'|\\$\\{[^}]+\\}|[^\\s,;}|]+)", "gi");
const credentialField = new RegExp("^(?:" + credentialName + ")$", "i");
const inventoryField = /^(?:ssh[ _-]*(?:host|user(?:name)?|port)|vps[ _-]*(?:host|ip|address)|origin[ _-]*(?:host|ip|address)|(?:administrator|admin)[ _-]*(?:user|login)|host|username|ip(?:[ _-]*address)?)$/i;
const textExtensions = new Set([".md", ".mdx", ".txt", ".json", ".lua", ".csv", ".tsv", ".html", ".css", ".js", ".mjs", ".ts", ".tsx", ".yml", ".yaml", ".xml", ".svg"]);
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp", ".tif", ".tiff", ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".zip", ".gz", ".br", ".7z", ".rar", ".tar", ".exe", ".dll", ".so", ".dylib", ".wasm", ".pf_fragment", ".pf_index", ".pf_meta"]);

function readPublishedText(full) {
  const extension = path.extname(full).toLowerCase();
  if (binaryExtensions.has(extension)) return null;
  const data = fs.readFileSync(full);
  if (textExtensions.has(extension)) return data.toString("utf8");
  // Unknown extensions are scanned when they contain UTF-8 text, including
  // extensionless scripts and configuration downloads. Binary review is separate.
  if (data.includes(0)) return null;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) ? null : text;
  } catch {
    return null;
  }
}

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

function markdownCells(line) {
  if (!line.includes("|")) return null;
  return line.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.replace(/[\x60*]/g, "").trim());
}

function separatorRow(cells) {
  return cells?.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function delimitedCells(line, delimiter) {
  const cells = [""];
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cells[cells.length - 1] += '""';
        index++;
        continue;
      }
      quoted = !quoted;
    }
    if (char === delimiter && !quoted) cells.push("");
    else cells[cells.length - 1] += char;
  }
  return cells.map(cell => cell.trim());
}

function tableValue(rules, field, value) {
  field = field.replace(/^["']|["']$/g, "");
  if (credentialField.test(field) && !placeholder(value)) rules.add("credential-value");
  const host = value.replace(/^["']|["']$/g, "").replace(/:\d+$/, "");
  const exampleHost = /(?:host|address|ip)$/i.test(field) && (
    /^localhost$/i.test(host)
    || (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)
      && host.split(".").every(part => Number(part) <= 255)
      && publicExampleAddress(host))
  );
  if (inventoryField.test(field) && !placeholder(value) && !exampleHost) rules.add("operator-inventory");
}

export function scanText(text, file) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const delimited = /\.(?:csv|tsv)$/i.test(file);
  let delimiter;
  let columns = null;
  let previousRow = null;
  for (const [index, line] of lines.entries()) {
    const rules = new Set();
    for (const match of line.matchAll(assignment)) {
      if (!placeholder(match[1])) rules.add("credential-value");
    }
    if (delimited && line.trim()) {
      delimiter ??= /\.tsv$/i.test(file) ? "\t" : line.includes(",") ? "," : ";";
      const cells = delimitedCells(line, delimiter);
      if (columns) columns.forEach((field, column) => tableValue(rules, field, cells[column] ?? ""));
      else columns = cells;
    } else if (!delimited) {
      const cells = markdownCells(line);
      if (separatorRow(cells)) {
        columns = previousRow;
      } else if (cells) {
        if (columns) columns.forEach((field, column) => tableValue(rules, field, cells[column] ?? ""));
        if (!separatorRow(markdownCells(lines[index + 1] ?? ""))) tableValue(rules, cells[0], cells[1] ?? "");
      } else {
        columns = null;
      }
      previousRow = cells;
    }
    for (const match of line.matchAll(/https?:\/\/([^\s/?#]+)@/gi)) {
      if (!match[1].split(":").every(placeholder)) rules.add("credential-url");
    }
    for (const match of line.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
      if (!publicExampleAddress(match[0])) rules.add("host-address");
    }
    const login = line.match(/\b(?:ssh|scp|sftp|rsync)\b[^\r\n]*?([^\s]+@[^\s]+)/i);
    if (login && !login[1].split("@").every(placeholder)) rules.add("operator-login");
    for (const match of line.matchAll(/(?:[A-Z]:[\\/]+Users[\\/]+|(?<![a-z0-9_\/-])\/home\/)([^\\/\s]+)/gi)) {
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
      } else if (entry.isFile()) {
        const text = readPublishedText(full);
        if (text === null) continue;
        if (isSource && /\.mdx?$/i.test(entry.name)) documents++;
        report.filesChecked++;
        report.findings.push(...scanText(text, file));
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

