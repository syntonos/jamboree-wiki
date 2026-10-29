import test from 'node:test';
import assert from 'node:assert/strict';
import projects from '../assets/projects.js';
import renderer from '../assets/note-features.js';
import content from '../assets/content-utils.js';

const notes = [
  {slug:'index',title:'Jamboree',body:''},
  {slug:'projects/index',title:'Projects',body:''},
  {slug:'guides/index',title:'Guides',body:''},
  {slug:'guides/electrical',title:'Electrical',body:''},
  {slug:'guides/electrical/firmware',title:'Firmware',body:'## Timers'},
  {slug:'projects/laser',title:'Laser tag',type:'project',status:'current',discipline:'Electrical, Computer science',tags:'infrared, firmware',body:'',links:['guides/electrical/firmware']},
  {slug:'projects/cart',title:'Cart',type:'project',status:'future',discipline:'Mechanical',tags:'drive',body:'',links:[]},
];

test('project filters combine status, discipline, and tags and leave source data intact', () => {
  const laser = notes.find(note => note.slug === 'projects/laser');
  assert(projects.matches(laser,{status:'current',discipline:'electrical',tag:'infrared'}));
  assert(!projects.matches(laser,{status:'past'}));
  assert(!projects.matches(laser,{discipline:'Mechanical'}));
  assert(!projects.matches(laser,{tag:'infra'}));
  assert(!projects.matches(notes[0],{}));
  assert.equal(notes.filter(note => projects.matches(note,{})).length,2);
  assert.deepEqual(projects.split('firmware, pcb, firmware, '),['firmware','pcb']);
});

test('filtered graph contains matching projects, referenced guides, and ancestor hubs', () => {
  assert.equal(projects.graphNotes(notes,{}),notes);
  const filtered = projects.graphNotes(notes,{tag:'infrared'});
  assert.deepEqual(filtered.map(note=>note.slug),['index','projects/index','guides/index','guides/electrical','guides/electrical/firmware','projects/laser']);
  assert(!filtered.some(note=>note.slug==='projects/cart'));
  assert.deepEqual(projects.graphNotes(notes,{status:'past'}),[]);
});

test('filter controls preserve unknown URL choices and escape content', () => {
  const controls = projects.controls(notes,{status:'archived',tag:'<script>'});
  assert.match(controls,/value="archived" selected/);
  assert.match(controls,/value="&lt;script&gt;" selected/);
  assert(!controls.includes('<script>'));
  assert.equal(projects.filterHref({tag:'cad & pcb'}),'?tag=cad+%26+pcb#/projects/index');
});

test('Markdown renders BOM tables, resource downloads, wiki links, and note anchors', () => {
  const body = '## BOM\n\n| Item | Qty | Reference |\n| --- | ---: | --- |\n| Controller | TBD | [Download CSV](/assets/resources/laser/bom.csv) |\n| `A|B` | 1 | [[guides/electrical/firmware|Firmware]] |\n\n[Timer guide](../guides/electrical/firmware.md#timers)';
  const html=renderer.markdown(body,'projects/laser',notes);
  assert.match(html,/<table>/);
  assert.equal((html.match(/<th scope="col"/g)||[]).length,3);
  assert.match(html,/<code>A\|B<\/code>/);
  assert.match(html,/href="#\/guides\/electrical\/firmware">Firmware<\/a>/);
  assert.equal((html.match(/<td /g)||[]).length,6);
  assert.match(html,/href="assets\/resources\/laser\/bom.csv" class="resource-download" download/);
  assert.match(html,/href="#\/guides\/electrical\/firmware#timers"/);
  assert.match(html,/data-heading-id="bom"/);
});

test('Markdown escapes raw HTML, keeps code literal, and blocks unsafe links', () => {
  const body='<script>alert(1)</script>\n\n```md\n[not a link](missing.md)\n```\n\n[bad](javascript:alert(1))\n\n## Same\n## Same\n## Same-1';
  const html=renderer.markdown(body,'projects/laser',notes);
  assert(!html.includes('<script>'));
  assert(!html.includes('href="javascript:'));
  assert.match(html,/<pre><code>\[not a link\]\(missing.md\)<\/code><\/pre>/);
  const ids=[...html.matchAll(/data-heading-id="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(ids,content.headingIds(body));
  assert.equal(new Set(ids).size,ids.length);
});

test('project facts and backlinks expose metadata without inventing a lead', () => {
  const laser={...notes.find(note=>note.slug==='projects/laser'),lead:'',contact:'',updated:'2026-10-29',next_milestone:'Bench test',help_needed:'Firmware'};
  const facts=renderer.facts(laser);
  assert.match(facts,/Unassigned/);
  assert.match(facts,/<time datetime="2026-10-29">/);
  assert.match(facts,/Bench test/);
  const firmware={...notes.find(note=>note.slug==='guides/electrical/firmware'),backlinks:['projects/laser']};
  const backlinks=renderer.backlinks(firmware,notes);
  assert.match(backlinks,/href="#\/projects\/laser"/);
  assert.match(backlinks,/Laser tag/);
});

test('Markdown links retain balanced URLs, title metadata, and wiki aliases inside tables', () => {
  const body='[Part](https://example.com/data(v2).pdf "Datasheet")\n\n| Link | Notes |\n| --- | --- |\n| [[guides/electrical/firmware|Timer guide]] | A\\|B |';
  const html=renderer.markdown(body,'projects/laser',notes);
  assert.match(html,/href="https:\/\/example.com\/data\(v2\).pdf"/);
  assert.match(html,/href="#\/guides\/electrical\/firmware">Timer guide<\/a>/);
  assert.match(html,/>A\|B<\/td>/);
  assert.equal((html.match(/<td /g)||[]).length,2);
});
