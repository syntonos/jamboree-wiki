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
