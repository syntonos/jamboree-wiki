import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import graph from '../assets/graph-data.js';

const notes = [
  {slug:'index',title:'Overview',links:['projects/index']},
  {slug:'about',title:'Access',links:['guides/electrical']},
  {slug:'projects/index',title:'Projects',links:[]},
  {slug:'guides/index',title:'Guides',links:[]},
  {slug:'guides/electrical',title:'Electrical',links:[]},
  {slug:'guides/electrical/firmware',title:'Firmware',links:[]},
  {slug:'projects/laser',title:'Laser tag',links:['guides/electrical/firmware','guides/electrical/firmware','missing','index']},
  {slug:'projects/synth',title:'Synth',links:['projects/laser']},
  {slug:'projects/cart',title:'Cart',links:[]},
];
const slugs = data => data.nodes.map(node=>node.slug).sort();
const pairs = data => data.edges.map(edge=>`${edge.source.slug}→${edge.target.slug}`).sort();

test('topology contains only explicit outgoing links, without folder-parent connections', () => {
  const original = JSON.stringify(notes);
  const data = graph.model(notes);
  assert.deepEqual(pairs(data),['projects/laser→guides/electrical/firmware','projects/synth→projects/laser']);
  assert.equal(data.nodes.find(node=>node.slug==='guides/electrical').degree,0);
  assert.equal(data.nodes.find(node=>node.slug==='projects/index').degree,0);
  assert.equal(data.nodes.find(node=>node.slug==='projects/cart').degree,0);
  assert.equal(JSON.stringify(notes),original);
  assert(data.nodes.every(node=>!('x' in node)&&!('y' in node)), 'data does not introduce a replacement graph layout');
});

test('local graph includes direct incoming and outgoing notes, without folder hubs or second-degree notes', () => {
  const data = graph.localModel(notes,'guides/electrical/firmware');
  assert.deepEqual(slugs(data),['guides/electrical/firmware','projects/laser']);
  assert.deepEqual(pairs(data),['projects/laser→guides/electrical/firmware']);
  assert.equal(data.currentSlug,'guides/electrical/firmware');
  const isolated = graph.localModel(notes,'guides/electrical');
  assert.deepEqual(slugs(isolated),['guides/electrical']);
  assert.equal(isolated.edges.length,0);
});

test('overview retains the complete graph while overview and access never become nodes', () => {
  const data = graph.localModel(notes,'index');
  assert.deepEqual(slugs(data),notes.filter(note=>!['index','about'].includes(note.slug)).map(note=>note.slug).sort());
  assert(!data.edges.some(edge=>['index','about'].includes(edge.source.slug)||['index','about'].includes(edge.target.slug)));
  assert.equal(data.currentSlug,undefined);
});

test('outgoing duplicates are removed while reciprocal links remain directed and count at both endpoints', () => {
  const data = graph.model([
    {slug:'a',links:['a','b','b']},
    {slug:'b',links:['a']},
  ]);
  assert.deepEqual(pairs(data),['a→b','b→a']);
  assert.deepEqual(data.nodes.map(node=>node.degree),[2,2]);
});

test('each component grades from its highest-degree central node to lighter outer notes', () => {
  const data = graph.model([
    {slug:'guides/a',links:['guides/b','guides/c','guides/d']},
    {slug:'guides/b',links:['guides/e']},
    {slug:'guides/c',links:[]},
    {slug:'guides/d',links:[]},
    {slug:'guides/e',links:['guides/f']},
    {slug:'guides/f',links:[]},
    {slug:'projects/separate',links:[]},
  ]);
  const bySlug = new Map(data.nodes.map(node=>[node.slug,node]));
  const path = ['guides/a','guides/b','guides/e','guides/f'].map(slug=>bySlug.get(slug));
  assert.deepEqual(path.map(node=>node.distance),[0,1,2,3]);
  assert(path.every(node=>node.centralSlug==='guides/a'));
  assert.equal(path[0].lightness,34);
  assert.equal(path[3].lightness,72);
  assert.equal(path[0].darkLightness,42);
  assert.equal(path[3].darkLightness,80);
  for (let i=1;i<path.length;i++) {
    assert(path[i].lightness>path[i-1].lightness);
    assert(path[i].darkLightness>path[i-1].darkLightness);
  }
  const isolated = bySlug.get('projects/separate');
  assert.equal(isolated.degree,0); assert.equal(isolated.lightness,72); assert.equal(isolated.darkLightness,80);
  assert.equal(graph.color(path[0]),'hsl(190 25% 34%)');
  assert.equal(graph.color(path[0],true),'hsl(190 28% 42%)');
  assert.equal(graph.color(isolated),'hsl(215 25% 72%)');
});

test('central seed tie-breaking is deterministic and local views retain full-graph degree and gradient', () => {
  const ordered = [
    {slug:'guides/z',links:['guides/b']},
    {slug:'guides/b',links:['guides/a']},
    {slug:'guides/a',links:['guides/y']},
    {slug:'guides/y',links:[]},
  ];
  const full = graph.model(ordered), reversed = graph.model([...ordered].reverse());
  assert(full.nodes.every(node=>node.centralSlug==='guides/a'));
  for (const node of reversed.nodes) {
    const original = full.nodes.find(other=>other.slug===node.slug);
    assert.equal(node.centralSlug,original.centralSlug);
    assert.equal(node.distance,original.distance);
    assert.equal(node.lightness,original.lightness);
  }
  const local = graph.localModel(ordered,'guides/z');
  assert.deepEqual(slugs(local),['guides/b','guides/z']);
  const b = local.nodes.find(node=>node.slug==='guides/b');
  const fullB = full.nodes.find(node=>node.slug===b.slug);
  assert.equal(b.degree,2); assert.equal(local.edges.length,1);
  for (const key of ['degree','distance','centralSlug','lightness','darkLightness','color','darkColor']) assert.equal(b[key],fullB[key]);
});

test('generated wiki graph matches its actual explicit note links exactly', async () => {
  const built = JSON.parse(await readFile(new URL('../assets/notes.json',import.meta.url),'utf8'));
  const visible = new Set(built.filter(note=>!['index','about'].includes(note.slug)).map(note=>note.slug));
  const expected = built.filter(note=>visible.has(note.slug)).flatMap(note=>[...new Set(note.links||[])].filter(slug=>visible.has(slug)&&slug!==note.slug).map(slug=>`${note.slug}→${slug}`)).sort();
  const data = graph.model(built);
  assert.deepEqual(pairs(data),expected);
  for (const node of data.nodes) assert.equal(node.degree,data.edges.filter(edge=>edge.source===node||edge.target===node).length);
});
