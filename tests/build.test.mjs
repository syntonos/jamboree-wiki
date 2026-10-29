import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'jamboree-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content', 'guides', 'mechanical'), { recursive: true });
  await mkdir(path.join(root, 'assets'));
  return root;
}

test('build preserves Markdown, string metadata, nested slugs, and note order', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'content', 'guides', 'mechanical.md'), '---\r\ntitle: Mechanical\r\n---\r\nHub note.\r\n');
  await writeFile(path.join(root, 'content', 'guides', 'mechanical', 'cad.md'), '---\ntitle: CAD: first sketch\nfeatured: true\norder: 01\nimage: \n---\n\n## Build → test\n\n---\nA divider stays in the body.\n');
  const notes = await build(root);
  assert.deepEqual(notes.map(note => note.slug), ['guides/mechanical/cad', 'guides/mechanical']);
  assert.equal(notes[0].title, 'CAD: first sketch');
  assert.equal(notes[0].featured, 'true');
  assert.equal(notes[0].order, '01');
  assert.equal(notes[0].image, '');
  assert.equal(notes[0].body, '## Build → test\n\n---\nA divider stays in the body.');
  assert.equal(notes[1].body, 'Hub note.');
  const firstBuild = await readFile(path.join(root, 'assets', 'notes.json'), 'utf8');
  await build(root);
  assert.equal(await readFile(path.join(root, 'assets', 'notes.json'), 'utf8'), firstBuild);
});

test('invalid frontmatter fails without overwriting the last generated notes', async t => {
  const root = await fixture(t);
  const output = path.join(root, 'assets', 'notes.json');
  await writeFile(output, 'previous build');
  const note = path.join(root, 'content', 'broken.md');
  await writeFile(note, '# No frontmatter\n');
  await assert.rejects(build(root), /broken.md: expected Markdown frontmatter/);
  await writeFile(note, '---\ntitle without a colon\n---\nBody.');
  await assert.rejects(build(root), /broken.md: expected a frontmatter field/);
  assert.equal(await readFile(output, 'utf8'), 'previous build');
});

test('internal Markdown, wiki, anchor, and download links generate deduplicated backlinks', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'content', 'projects'));
  await writeFile(path.join(root, 'content', 'index.md'), '---\ntitle: Home\n---\n[Laser tag](#/projects/laser-tag)');
  await writeFile(path.join(root, 'content', 'guides', 'mechanical.md'), '---\ntitle: Mechanical\n---\n## CAD\nFirst.\n\n## CAD\nSecond.');
  await writeFile(path.join(root, 'assets', 'design-brief.md'), '# Downloadable design brief');
  await writeFile(path.join(root, 'content', 'projects', 'wiring.csv'), 'Connection,Pin\n');
  await writeFile(path.join(root, 'assets', 'concept.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(path.join(root, 'content', 'projects', 'laser-tag.md'), `---
title: Laser tag
image: /assets/concept.svg
---
## Assembly
[Mechanical](../guides/mechanical.md#cad)
[Second heading](../guides/mechanical.md#cad-1)
[[guides/mechanical|Mechanical guide]]
[Root note](/guides/mechanical.md)
[Home](#/)
[Section](#assembly)
[Brief](../../assets/design-brief.md)
[Concept](/assets/concept.svg)
[Adjacent file](wiring.csv)
![Diagram](/assets/concept.svg)
[External](https://example.org/component_(A))
\`[not a link](../missing.md)\`
\`\`\`md
[not a link](../missing.md)
\`\`\`
<!-- [[also-missing]] -->
`);
  const notes = await build(root);
  const project = notes.find(note => note.slug === 'projects/laser-tag');
  const guide = notes.find(note => note.slug === 'guides/mechanical');
  assert.deepEqual(project.links, ['guides/mechanical', 'index']);
  assert.deepEqual(project.backlinks, ['index']);
  assert.deepEqual(guide.backlinks, ['projects/laser-tag']);
  assert.deepEqual(guide.links, []);
});

test('broken note targets, headings, assets, and unsafe links fail with source lines and preserve output', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'content', 'projects'));
  await writeFile(path.join(root, 'content', 'guides', 'mechanical.md'), '---\ntitle: Mechanical\n---\n## CAD\nNotes.');
  const output = path.join(root, 'assets', 'notes.json');
  await writeFile(output, 'last successful build');
  await writeFile(path.join(root, 'content', 'projects', 'laser-tag.md'), `---
title: Laser tag
---

[Missing](../missing.md)
[Missing section](../guides/mechanical.md#not-there)
[Missing asset](/assets/missing.step)
[Unsafe](javascript:alert(1))
`);
  await assert.rejects(build(root), error => {
    assert.match(error.message, /content\/projects\/laser-tag.md:5: note does not exist/);
    assert.match(error.message, /content\/projects\/laser-tag.md:6: heading does not exist/);
    assert.match(error.message, /content\/projects\/laser-tag.md:7: local file does not exist/);
    assert.match(error.message, /content\/projects\/laser-tag.md:8: unsupported or unsafe URL scheme/);
    return true;
  });
  assert.equal(await readFile(output, 'utf8'), 'last successful build');
});

test('check-only validates current notes without replacing the generated data', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'content', 'index.md'), '---\ntitle: Home\n---\n## Notes\nStart.');
  await build(root);
  const output = path.join(root, 'assets', 'notes.json');
  const previous = await readFile(output, 'utf8');
  await writeFile(path.join(root, 'content', 'about.md'), '---\ntitle: About\n---\n[Home](#/)');
  const checked = await build(root, {checkOnly: true});
  assert.equal(checked.length, 2);
  assert.deepEqual(checked.find(note => note.slug === 'index').backlinks, ['about']);
  assert.equal(await readFile(output, 'utf8'), previous);
});

test('missing frontmatter feature images are checked at their source line', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'content', 'index.md'), '---\ntitle: Home\nimage: /assets/not-uploaded.png\n---\nNotes.');
  await assert.rejects(build(root), /content\/index.md:3: local file does not exist: assets\/not-uploaded.png/);
});

test('shared link and heading rules handle route aliases, duplicate headings, and encoded file names', async () => {
  const {default: content} = await import('../assets/content-utils.js');
  const notes = [{slug: 'index'}, {slug: 'guides/index'}, {slug: 'guides/mechanical'}];
  assert.deepEqual(content.headingIds('## CAD\n## CAD\n## CAD-1\n## Café & tools\n```md\n## Not a heading\n```'), ['cad', 'cad-1', 'cad-1-1', 'cafe-tools']);
  assert.equal(content.resolveLink('/guides', 'index', notes).slug, 'guides/index');
  assert.equal(content.resolveLink('#cad', 'guides/mechanical', notes).href, '#/guides/mechanical#cad');
  const file = content.resolveLink('/assets/build%20%231.csv', 'index', notes);
  assert.equal(file.path, 'assets/build #1.csv');
  assert.equal(file.href, 'assets/build%20%231.csv');
  assert.equal(content.resolveLink('cad.step', 'projects/laser-tag', notes).path, 'content/projects/cad.step');
  assert.equal(content.resolveLink('data:text/html,unsafe', 'index', notes).kind, 'invalid');
  assert.equal(content.resolveLink('#/graph', 'index', notes).virtual, true);
});

test('feature images permit HTTP(S) resources but reject mailto and tel URLs', async t => {
  const root = await fixture(t);
  const filename = path.join(root, 'content', 'index.md');
  for (const target of ['mailto:club@example.org', 'tel:+15555550123']) {
    await writeFile(filename, `---\ntitle: Home\nimage: ${target}\n---\nNotes.`);
    await assert.rejects(build(root), /content\/index.md:3: image must point to a local file or an HTTP\(S\) URL/);
  }
  for (const target of ['https://example.org/feature.jpg', 'http://example.org/feature.jpg', '//example.org/feature.jpg']) {
    await writeFile(filename, `---\ntitle: Home\nimage: ${target}\n---\nNotes.`);
    assert.equal((await build(root))[0].image, target);
  }
});

test('link extraction offsets cover complete Markdown, image, and wiki syntax', async () => {
  const {default: content} = await import('../assets/content-utils.js');
  const source = 'Before [Part](https://example.org/chip_(A) "Part details") and [[guides/mechanical|CAD]].\r\n![Photo](</assets/feature photo.jpg> "Feature photo") after.';
  const links = content.extractLinks(source);
  assert.equal(links.length, 3);
  assert.deepEqual(links.map(link => source.slice(link.start, link.end)), [
    '[Part](https://example.org/chip_(A) "Part details")',
    '[[guides/mechanical|CAD]]',
    '![Photo](</assets/feature photo.jpg> "Feature photo")',
  ]);
  assert.equal(links[0].target, 'https://example.org/chip_(A)');
  assert.equal(links[2].target, '/assets/feature photo.jpg');
  assert.equal(links[2].image, true);
  assert.equal(links[2].line, 2);
});
