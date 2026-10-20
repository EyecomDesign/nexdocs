import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkContent } from './check-content.mjs';

const script = fileURLToPath(new URL('./check-content.mjs', import.meta.url));

function fixture(t, files = {}, redirects = []) {
  const prefix = path.join(os.tmpdir(), 'nexdocs-content-');
  const root = fs.mkdtempSync(prefix);
  t.after(() => {
    assert.ok(root.startsWith(prefix));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const defaults = {
    'content/en/introduction/index.mdx': '# Introduction\n',
    'content/en/developer/index.mdx': '# Developer\n',
    'content/en/administrator/index.mdx': '# Administrator\n',
    'content/en/guides/index.mdx': '# Guides\n',
    'content/en/guides/child.mdx': '# Child\n\n## Known heading [#custom-id]\n',
    'public/example image.png': 'harmless fixture',
    'public/rotation-authoring/example.lua': '-- harmless fixture\n',
    'next.config.ts': `const config = { async redirects() { return ${JSON.stringify([
      { source: '/', destination: '/en/introduction', permanent: false },
      { source: '/:lang(en)', destination: '/:lang/introduction', permanent: false },
      ...redirects,
    ])}; } }; export default config;`,
  };
  for (const [name, source] of Object.entries({ ...defaults, ...files })) {
    if (source === null) continue;
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  return root;
}

const rules = result => result.findings.map(f => f.rule);
const has = (result, rule) => assert.ok(rules(result).includes(rule), JSON.stringify(result.findings));

test('accepts rendered leaf-relative links, Markdown extensions, query/fragment and locale redirects', async t => {
  const root = fixture(t, {
    'content/en/guides/one.mdx': '# One\n\n[Child](./child.mdx?view=full#custom-id) [Root](/) [English](/en) [Legacy](/de/introduction) [Unprefixed](/developer)\n',
  });
  assert.deepEqual((await checkContent(root)).findings, []);
});

test('resolves folder index links from the rendered URL, not the source directory', async t => {
  const root = fixture(t, { 'content/en/guides/index.mdx': '# Guides\n\n[Wrong](./child)\n[Right](./guides/child)\n' });
  const result = await checkContent(root);
  assert.equal(result.findings.filter(f => f.rule === 'missing-route').length, 1);
  assert.ok(result.findings.some(f => f.file === 'content/en/guides/index.mdx' && f.line === 3));
});

test('rejects missing Markdown and reference-style route destinations', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n[Missing](/en/missing)\n\n[Reference][lost]\n\n[lost]: /en/also-missing\n' });
  assert.equal((await checkContent(root)).findings.filter(f => f.rule === 'missing-route').length, 2);
});

test('rejects missing literal and expression-string JSX hrefs', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n<Cards.Card href="/en/no-card" />\n\n<ImageCard href={"/en/no-image-card"} />\n' });
  assert.equal((await checkContent(root)).findings.filter(f => f.rule === 'missing-route').length, 2);
});

test('does not strip Markdown extensions from JSX hrefs', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n<a href="/en/guides/child.mdx">Wrong extension</a>\n' });
  has(await checkContent(root), 'missing-route');
});

test('accepts static Markdown images from public and source-relative imports', async t => {
  const root = fixture(t, {
    'content/en/guides/one.mdx': '# One\n\n![Public](/example%20image.png)\n\n![Local](./figure.png)\n',
    'content/en/guides/figure.png': 'harmless fixture',
  });
  assert.deepEqual((await checkContent(root)).findings, []);
});

test('rejects missing Markdown, reference image and JSX image/src destinations', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n![A](/missing.png)\n\n![B][lost]\n\n[lost]: ./absent.png\n\n<ImageCard image="/no-card.png" />\n\n<img src={"/no-img.png"} alt="C" />\n' });
  assert.equal((await checkContent(root)).findings.filter(f => f.rule === 'missing-asset').length, 4);
});

test('rejects case-mismatched assets even on a case-insensitive filesystem', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n![Wrong case](/Example%20image.png)\n' });
  has(await checkContent(root), 'missing-asset');
});

test('decodes percent-encoded public filenames once', async t => {
  const root = fixture(t, {
    'public/literal%20name.png': 'harmless fixture',
    'content/en/guides/one.mdx': '# One\n\n![Literal percent](/literal%2520name.png)\n',
  });
  assert.deepEqual((await checkContent(root)).findings, []);
});

test('accepts existing CodeFile downloads and rejects missing files or traversal', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n<CodeFile path="example.lua" />\n\n<CodeFile path="lost.lua" />\n\n<CodeFile path="../example image.png" />\n' });
  const result = await checkContent(root);
  has(result, 'missing-codefile');
  has(result, 'outside-codefile');
  assert.equal(result.findings.length, 2);
});

test('ignores fenced code and inline-code examples containing fake references', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n`[sample](/en/no-inline)`\n\n```mdx\n[Example](/en/no-code)\n![Example](/no.png)\n<CodeFile path="no.lua" />\n```\n' });
  assert.deepEqual((await checkContent(root)).findings, []);
});

test('checks same-site absolute URLs without fetching external sites', async t => {
  const root = fixture(t, { 'README.md': '[Missing guide](https://docs.nexor.app/en/guides/gone)\n[External](https://example.invalid/untested)\n' });
  const result = await checkContent(root);
  assert.equal(result.findings.filter(f => f.rule === 'missing-route').length, 1);
  assert.equal(result.findings[0].file, 'README.md');
});

test('rejects an invalid redirect destination', async t => {
  const root = fixture(t, {}, [{ source: '/:lang(en)/old', destination: '/:lang/gone', permanent: false }]);
  has(await checkContent(root), 'redirect-target');
});

test('validates wildcard redirects against actual destination inventory', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n[Old](/en/old/child)\n' }, [
    { source: '/:lang(en)/old/:path*', destination: '/:lang/guides/:path*', permanent: false },
  ]);
  assert.deepEqual((await checkContent(root)).findings, []);
});

test('rejects wildcard redirects with a missing destination prefix', async t => {
  const root = fixture(t, {}, [{ source: '/:lang(en)/old/:path*', destination: '/:lang/missing/:path*', permanent: false }]);
  has(await checkContent(root), 'redirect-target');
});

test('detects redirect loops without hanging', async t => {
  const root = fixture(t, {}, [
    { source: '/en/a', destination: '/en/b', permanent: false },
    { source: '/en/b', destination: '/en/a', permanent: false },
  ]);
  has(await checkContent(root), 'redirect-cycle');
});

test('requires the Introduction, Developer and Administrator entry pages', async t => {
  const root = fixture(t, { 'content/en/administrator/index.mdx': null });
  has(await checkContent(root), 'entry-route');
});

test('rejects broken site-root and English-locale-root redirects', async t => {
  const root = fixture(t, {
    'next.config.ts': 'const config = { async redirects() { return [{source:"/", destination:"/en/gone", permanent:false}, {source:"/en", destination:"/en/also-gone", permanent:false}]; } }; export default config;',
  });
  assert.equal((await checkContent(root)).findings.filter(f => f.rule === 'entry-route').length, 2);
});

test('does not invent an index route for a folder that only contains child pages', async t => {
  const root = fixture(t, {
    'content/en/guides/one.mdx': '# One\n\n[No index](/en/without-index)\n',
    'content/en/without-index/child.mdx': '# Child\n',
  });
  has(await checkContent(root), 'missing-route');
});

test('detects a redirect that makes a section landing page unreachable', async t => {
  const root = fixture(t, {}, [{ source: '/en/administrator', destination: '/en/introduction', permanent: false }]);
  has(await checkContent(root), 'hidden-entry');
});

test('checks Next links in current lesson order while permitting removed-number gaps', async t => {
  const root = fixture(t, {
    'content/en/course/01-start.mdx': '# Start\n\nNext: [End](./03-end)\n',
    'content/en/course/03-end.mdx': '# End\n',
  });
  assert.deepEqual((await checkContent(root)).findings, []);
});

test('rejects a Next link to the wrong existing lesson and a missing Next link', async t => {
  const root = fixture(t, {
    'content/en/course/01-start.mdx': '# Start\n\nNext: [Wrong](./03-end)\n',
    'content/en/course/02-middle.mdx': '# Middle\n',
    'content/en/course/03-end.mdx': '# End\n',
  });
  const result = await checkContent(root);
  has(result, 'next-order');
  has(result, 'next-missing');
});

test('reports malformed Next fragments with file/line diagnostics instead of throwing', async t => {
  const root = fixture(t, {
    'content/en/course/01-start.mdx': '# Start\n\nNext: [End](./02-end#%)\n',
    'content/en/course/02-end.mdx': '# End\n',
  });
  const result = await checkContent(root);
  assert.ok(result.findings.some(f => f.file === 'content/en/course/01-start.mdx'
    && f.line === 3 && f.rule === 'invalid-reference'));
  const cli = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /content\/en\/course\/01-start\.mdx:3 \[invalid-reference\]/);
  assert.doesNotMatch(cli.stderr, /URIError|at decodeURIComponent/);
});

test('validates custom heading fragments and rejects absent fragments', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n[Good](./child#custom-id) [Bad](./child#absent)\n' });
  assert.equal((await checkContent(root)).findings.filter(f => f.rule === 'missing-fragment').length, 1);
});

test('reports nonliteral MDX references for review without evaluating expressions', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n<ImageCard href={someVariable} />\n' });
  has(await checkContent(root), 'dynamic-reference');
});

test('reports malformed MDX with its file and source line', async t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n<Broken\n' });
  const result = await checkContent(root);
  has(result, 'parse');
  assert.ok(result.findings.some(f => f.file === 'content/en/guides/one.mdx' && f.line >= 3));
});

test('rejects dynamic redirect config instead of executing it', async t => {
  const root = fixture(t, { 'next.config.ts': 'const config = { async redirects() { return makeRedirects(); } }; export default config;' });
  has(await checkContent(root), 'redirect-config');
});

test('CLI returns failure and file/line/rule diagnostics for a broken reference', t => {
  const root = fixture(t, { 'content/en/guides/one.mdx': '# One\n\n[Missing](/en/not-there)\n' });
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /content\/en\/guides\/one\.mdx:3 \[missing-route\]/);
});
