import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({window: {}});
vm.runInContext(await readFile(new URL('../assets/full-graph.js', import.meta.url), 'utf8'), context);
const graph = context.window.JamboreeGraph;
const notes = [
  {slug: 'index', title: 'Overview', links: ['projects/index']},
  {slug: 'about', title: 'About', links: []},
  {slug: 'projects/index', title: 'Projects', links: []},
  {slug: 'guides/index', title: 'Guides', links: []},
  {slug: 'guides/electrical', title: 'Electrical', links: []},
  {slug: 'guides/electrical/firmware', title: 'Firmware', links: []},
  {slug: 'projects/laser', title: 'Laser tag', links: ['guides/electrical/firmware']},
  {slug: 'projects/synth', title: 'Synth', links: ['projects/laser']},
  {slug: 'projects/cart', title: 'Cart', links: []},
  {slug: 'isolated', title: 'Isolated note', links: []},
];
const slugs = data => Array.from(data.nodes, node => node.slug).sort();

test('a note graph includes incoming, outgoing, and hierarchy neighbors, but no second-degree nodes', () => {
  const data = graph.localModel(notes, 'projects/laser');
  assert.deepEqual(slugs(data), ['guides/electrical/firmware', 'projects/index', 'projects/laser', 'projects/synth']);
  assert.equal(data.currentSlug, 'projects/laser');
  assert.equal(data.edges.length, 4);
  const visible = new Set(slugs(data));
  for (const edge of data.edges) {
    assert(visible.has(edge.source.slug));
    assert(visible.has(edge.target.slug));
  }
});

test('hierarchy notes show their immediate parent and children', () => {
  const data = graph.localModel(notes, 'guides/electrical');
  assert.deepEqual(slugs(data), ['guides/electrical', 'guides/electrical/firmware', 'guides/index']);
  assert.equal(data.edges.length, 2);
});

test('overview shows the complete graph without adding overview or access nodes', () => {
  const data = graph.localModel(notes, 'index');
  assert.deepEqual(slugs(data), notes.filter(note => !['index', 'about'].includes(note.slug)).map(note => note.slug).sort());
  for (const edge of data.edges) {
    assert(!['index', 'about'].includes(edge.source.slug));
    assert(!['index', 'about'].includes(edge.target.slug));
  }
  assert.equal(data.currentSlug, undefined);
});

test('an isolated note stays visible in its local graph without unrelated notes', () => {
  const original = JSON.stringify(notes);
  const data = graph.localModel(notes, 'isolated');
  assert.deepEqual(slugs(data), ['isolated']);
  assert.equal(data.edges.length, 0);
  assert.equal(JSON.stringify(notes), original);
});
