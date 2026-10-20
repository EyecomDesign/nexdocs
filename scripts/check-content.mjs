import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

// Reuse the parser shipped with Nextra, rather than guessing MDX with regexes or
// executing its JavaScript. Resolve its own dependencies under pnpm as well.
const require = createRequire(import.meta.url);
const nextraRequire = createRequire(require.resolve('nextra/package.json'));
const dependency = name => import(pathToFileURL(nextraRequire.resolve(name)).href);
const [{ createProcessor }, { default: gfm }, { default: frontmatter }, { default: Slugger }] = await Promise.all([
  dependency('@mdx-js/mdx'), dependency('remark-gfm'), dependency('remark-frontmatter'), dependency('github-slugger'),
]);
const { match, compile, parse } = require('next/dist/compiled/path-to-regexp');
const origin = 'https://docs.nexor.app';
const slash = value => value.split(path.sep).join('/');
const cleanRoute = value => value.replace(/\/$/, '') || '/';
const flatten = node => node.value ?? node.children?.map(flatten).join('') ?? '';

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function inventory(root, directory) {
  const files = new Set();
  function visit(relative) {
    if (!fs.existsSync(path.join(root, relative))) return;
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) files.add(name);
    }
  }
  visit(directory);
  return files;
}

function literal(attribute) {
  if (typeof attribute.value === 'string') return attribute.value;
  const expression = attribute.value?.data?.estree?.body?.[0]?.expression;
  if (expression?.type === 'Literal' && typeof expression.value === 'string') return expression.value;
  if (expression?.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return expression.quasis[0].value.cooked;
  }
  return null;
}

function readPage(root, file, add) {
  const route = '/' + file.replace(/^content\//, '').replace(/\.mdx?$/, '').replace(/\/index$/, '');
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  let tree;
  try {
    tree = createProcessor({ format: file.endsWith('.mdx') ? 'mdx' : 'md', remarkPlugins: [gfm, frontmatter] }).parse(source);
  } catch (error) {
    add(file, error.line ?? error.place?.start?.line ?? 1, 'parse', 'Could not parse Markdown/MDX; inspect the source syntax.');
    return { file, route, references: [], headings: new Set(), next: [] };
  }
  const definitions = new Map();
  walk(tree, node => { if (node.type === 'definition') definitions.set(node.identifier, node.url); });
  const references = [];
  const headings = new Set();
  const next = [];
  const slugger = new Slugger();
  const urlOf = node => node.url ?? definitions.get(node.identifier);
  walk(tree, node => {
    const line = node.position?.start.line ?? 1;
    if (node.type === 'heading' && node.depth > 1) {
      // Nextra 4.6.1 remark-custom-heading-id + remark-headings: an explicit
      // [#id] is still passed through github-slugger, including duplicates.
      const value = flatten(node);
      const custom = node.children.at(-1)?.type === 'text' && node.children.at(-1).value.match(/\s*\[#([^]+?)]\s*$/);
      headings.add(slugger.slug(custom ? custom[1] : value));
    }
    if (node.type === 'paragraph' && /^Next:\s/.test(flatten(node))) {
      walk(node, child => {
        if (child.type === 'link' || child.type === 'linkReference') next.push({ url: urlOf(child), line });
      });
    }
    if (['link', 'linkReference', 'image', 'imageReference'].includes(node.type)) {
      references.push({ url: urlOf(node), kind: node.type.startsWith('image') ? 'asset' : 'link', markdown: true, line });
    }
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
    if (node.name === 'summary') headings.add(slugger.slug(flatten(node)));
    for (const attribute of node.attributes) {
      const kind = attribute.name === 'href' ? 'link'
        : ['src', 'image'].includes(attribute.name) ? 'asset'
        : node.name === 'CodeFile' && attribute.name === 'path' ? 'codefile' : null;
      if (attribute.name === 'id') {
        const id = literal(attribute);
        if (id) headings.add(id);
      }
      if (!kind) continue;
      const url = literal(attribute);
      if (url === null) add(file, attribute.position?.start.line ?? line, 'dynamic-reference', 'Use a literal reference so it can be checked; expressions are not evaluated.');
      else references.push({ url, kind, markdown: false, line: attribute.position?.start.line ?? line });
    }
  });
  return { file, route, references, headings, next };
}

function readRedirects(root, add) {
  const file = 'next.config.ts';
  if (!fs.existsSync(path.join(root, file))) {
    add(file, 1, 'redirect-config', 'Missing Next configuration.');
    return [];
  }
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let method;
  function find(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'redirects') method = node;
    ts.forEachChild(node, find);
  }
  find(ast);
  if (!method) return [];
  const returned = method.body?.statements.find(ts.isReturnStatement)?.expression;
  const lineOf = node => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
  if (!returned || !ts.isArrayLiteralExpression(returned)) {
    add(file, lineOf(method), 'redirect-config', 'Redirects must be a literal returned array for this static check.');
    return [];
  }
  const redirects = [];
  for (const item of returned.elements) {
    const fields = {};
    if (ts.isObjectLiteralExpression(item)) for (const property of item.properties) {
      if (ts.isPropertyAssignment(property)) {
        const key = property.name.getText(ast).replace(/^['"]|['"]$/g, '');
        fields[key] = ts.isStringLiteral(property.initializer) ? property.initializer.text : null;
      }
    }
    const line = lineOf(item);
    if (typeof fields.source !== 'string' || typeof fields.destination !== 'string' || 'has' in fields || 'missing' in fields) {
      add(file, line, 'redirect-config', 'Use static source/destination redirects; conditional or computed rules need explicit checker support.');
      continue;
    }
    try {
      redirects.push({ ...fields, line, matches: match(fields.source, { decode: decodeURIComponent }),
        buildSource: compile(fields.source, { encode: encodeURIComponent }),
        buildDestination: fields.destination.startsWith('/') ? compile(fields.destination, { encode: encodeURIComponent }) : null });
    } catch {
      add(file, line, 'redirect-config', 'The redirect path pattern could not be parsed.');
    }
  }
  return redirects;
}

function routeResolver(routes, publicFiles, redirects) {
  return input => {
    let current = cleanRoute(input);
    const visited = new Set();
    for (let hop = 0; hop < 64; hop++) {
      if (visited.has(current)) return { route: current, cycle: true, exists: false };
      visited.add(current);
      const redirect = redirects.find(rule => rule.matches(current));
      if (redirect) {
        if (!redirect.buildDestination) return { external: true, exists: true };
        current = cleanRoute(new URL(redirect.buildDestination(redirect.matches(current).params), origin).pathname);
        continue;
      }
      // Match this site's English-only middleware (not a general Next router).
      // Assets and API paths are excluded there. Redirects run before middleware.
      if (!current.startsWith('/api/') && !current.startsWith('/_next/') && !current.startsWith('/_pagefind/') && !current.includes('.')) {
        if (current === '/de' || current.startsWith('/de/')) { current = '/en' + current.slice(3); continue; }
        if (current !== '/en' && !current.startsWith('/en/')) { current = '/en' + (current === '/' ? '' : current); continue; }
      }
      return { route: current, exists: routes.has(current) || publicFiles.has(current) };
    }
    return { route: current, cycle: true, exists: false };
  };
}

function localUrl(value, page, markdown = false) {
  if (!value) return null;
  // Nextra strips .md/.mdx only from Markdown links, not JSX hrefs.
  if (markdown) value = value.replace(/\.mdx?(?=[#?]|$)/, '');
  const url = new URL(value, origin + page.route);
  if (url.origin !== origin) return null;
  return { route: cleanRoute(decodeURIComponent(url.pathname)), fragment: decodeURIComponent(url.hash.slice(1)) };
}

export async function checkContent(root = process.cwd()) {
  root = path.resolve(root);
  const findings = [];
  const add = (file, line, rule, message) => findings.push({ file: slash(file), line, rule, message });
  const contentFiles = inventory(root, 'content/en');
  const publicInventory = inventory(root, 'public');
  const publicFiles = new Set([...publicInventory].map(file => '/' + file.slice('public/'.length)));
  const sourceFiles = new Set([...contentFiles, ...publicInventory]);
  const pages = [...contentFiles].filter(file => /\.mdx?$/.test(file)).sort().map(file => readPage(root, file, add));
  const routes = new Map(pages.map(page => [page.route, page]));
  const redirects = readRedirects(root, add);
  const resolve = routeResolver(routes, publicFiles, redirects);
  const documents = [...pages];
  if (fs.existsSync(path.join(root, 'README.md'))) documents.push(readPage(root, 'README.md', add));
  let referenceCount = 0;
  for (const page of documents) for (const reference of page.references) {
    referenceCount++;
    const { kind, markdown, line } = reference;
    if (kind === 'codefile') {
      const relative = path.posix.normalize(reference.url.replaceAll('\\', '/'));
      if (relative === '..' || relative.startsWith('../') || path.posix.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) {
        add(page.file, line, 'outside-codefile', 'CodeFile must stay inside public/rotation-authoring.');
      } else if (!publicInventory.has('public/rotation-authoring/' + relative)) {
        add(page.file, line, 'missing-codefile', 'CodeFile has no matching public/rotation-authoring file (case matters).');
      }
      continue;
    }
    let target;
    try { target = localUrl(reference.url, page, kind === 'link' && markdown); }
    catch { add(page.file, line, 'invalid-reference', 'The reference is not a valid URL.'); continue; }
    if (!target) continue;
    if (kind === 'asset') {
      // Markdown images become source imports in remark-static-image. JSX src
      // and ImageCard image strings are browser/public paths instead.
      const sourceRelative = markdown && !reference.url.startsWith('/')
        ? cleanRoute(new URL(reference.url, origin + '/' + page.file).pathname).slice(1) : null;
      const exists = sourceRelative ? sourceFiles.has(decodeURIComponent(sourceRelative)) : publicFiles.has(target.route);
      if (!exists) add(page.file, line, 'missing-asset', 'Image has no matching source/public file (case matters).');
      continue;
    }
    const result = resolve(target.route);
    if (result.cycle) add(page.file, line, 'redirect-cycle', 'Reference enters a redirect loop.');
    else if (!result.exists) add(page.file, line, 'missing-route', 'Target is not published; check spelling and the rendered relative URL.');
    else if (target.fragment && routes.has(result.route) && !routes.get(result.route).headings.has(target.fragment)) {
      add(page.file, line, 'missing-fragment', 'The target page has no matching heading or explicit id.');
    }
  }
  // Validate redirect destinations against the actual page/download inventory.
  // For parameterized destinations, instantiate existing targets, not invented
  // wildcard suffixes that no redirect can promise will be published.
  for (const redirect of redirects) {
    if (!redirect.buildDestination) continue;
    let samples = [];
    const tokens = parse(redirect.destination).filter(token => typeof token === 'object');
    if (tokens.length) {
      const destinationMatch = match(redirect.destination, { decode: decodeURIComponent });
      for (const candidate of [...routes.keys(), ...publicFiles]) {
        const matched = destinationMatch(candidate);
        if (matched) try { samples.push(redirect.buildSource(matched.params)); } catch { /* Not allowed by the source constraint. */ }
      }
    } else {
      const params = Object.fromEntries(parse(redirect.source).filter(token => typeof token === 'object').map(token =>
        [token.name, token.modifier === '*' ? [] : token.name === 'lang' ? 'en' : 'example']));
      try { samples.push(redirect.buildSource(params)); } catch { /* Report an unsupported or empty destination below. */ }
    }
    if (!samples.length) add('next.config.ts', redirect.line, 'redirect-target', 'No published destination matches this redirect pattern.');
    for (const sample of samples) {
      const result = resolve(sample);
      if (result.cycle) { add('next.config.ts', redirect.line, 'redirect-cycle', 'Redirect enters a loop.'); break; }
      if (!result.exists) { add('next.config.ts', redirect.line, 'redirect-target', 'Redirect does not end at a published route or file.'); break; }
    }
  }
  for (const entry of ['/', '/en', '/en/introduction', '/en/developer', '/en/administrator']) {
    const result = resolve(entry);
    if (!result.exists || result.external) add('next.config.ts', 1, 'entry-route', `Required entry ${entry} does not reach an English page.`);
    else if (entry.startsWith('/en/') && result.route !== entry) {
      add('next.config.ts', 1, 'hidden-entry', `Required landing ${entry} is hidden by a redirect.`);
    }
  }
  const courses = new Map();
  for (const page of pages) if (/\/course\/\d+-[^/]+$/.test(page.route)) {
    const directory = path.posix.dirname(page.route);
    if (!courses.has(directory)) courses.set(directory, []);
    courses.get(directory).push(page);
  }
  for (const lessons of courses.values()) {
    lessons.sort((a, b) => Number(path.posix.basename(a.route).split('-')[0]) - Number(path.posix.basename(b.route).split('-')[0]));
    for (let index = 0; index < lessons.length - 1; index++) {
      const page = lessons[index];
      if (!page.next.length) add(page.file, 1, 'next-missing', 'Add one Next link to the next published numbered lesson.');
      else {
        const target = localUrl(page.next[0].url, page, true);
        if (page.next.length !== 1 || !target || resolve(target.route).route !== lessons[index + 1].route) {
          add(page.file, page.next[0].line, 'next-order', 'Next must lead to the next published numbered lesson.');
        }
      }
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return { findings, pages: pages.length, references: referenceCount, redirects: redirects.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--root')) {
    console.error('Usage: node scripts/check-content.mjs [--root <checkout>]');
    process.exitCode = 2;
  } else {
    const result = await checkContent(args[1]);
    for (const finding of result.findings) console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
    console.log(`${result.pages} pages, ${result.references} references, ${result.redirects} redirect rules checked.`);
    process.exitCode = result.findings.length ? 1 : 0;
  }
}
