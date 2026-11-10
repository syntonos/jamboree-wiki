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
  const laser={...notes.find(note=>note.slug==='projects/laser'),lead:'',contact:'',updated:'2026-10-29',next_milestone:'Bench test',stage:'in testing',help_needed:'Old help request'};
  const facts=renderer.facts(laser);
  assert.match(facts,/Unassigned/);
  assert.match(facts,/<time datetime="2026-10-29">/);
  assert.match(facts,/Bench test/);
  assert.match(facts,/<h2>Status<\/h2><p>In testing<\/p>/);
  assert.doesNotMatch(facts,/Help needed|Old help request/);
  for (const [stage,label] of [['completed','Completed'],['in design','In design'],['in testing','In testing']]) {
    assert(renderer.facts({...laser,stage}).includes(`<h2>Status</h2><p>${label}</p>`));
  }
  assert(renderer.facts({...laser,stage:undefined,status:'past'}).includes('<h2>Status</h2><p>Completed</p>'));
  const firmware={...notes.find(note=>note.slug==='guides/electrical/firmware'),backlinks:['projects/laser']};
  const backlinks=renderer.backlinks(firmware,notes);
  assert.match(backlinks,/href="#\/projects\/laser"/);
  assert.match(backlinks,/Laser tag/);
  assert.equal(renderer.backlinks({...firmware,backlinks:[]},notes),'');
});

test('Markdown links retain balanced URLs, title metadata, and wiki aliases inside tables', () => {
  const body='[Part](https://example.com/data(v2).pdf "Datasheet")\n\n| Link | Notes |\n| --- | --- |\n| [[guides/electrical/firmware|Timer guide]] | A\\|B |';
  const html=renderer.markdown(body,'projects/laser',notes);
  assert.match(html,/href="https:\/\/example.com\/data\(v2\).pdf"/);
  assert.match(html,/href="#\/guides\/electrical\/firmware">Timer guide<\/a>/);
  assert.match(html,/>A\|B<\/td>/);
  assert.equal((html.match(/<td /g)||[]).length,2);
});

test('LaTeX delimiters preserve equations and exclude code, escaped dollars, and currency', () => {
  const body = String.raw`Energy $E = mc^2$ and \(\frac{a_1}{b}\).

$$
\begin{aligned} x &= 1 \\ y &= 2 \end{aligned}
$$

\[
\sum_{i=1}^n i
\]

Literal \$5, $10 and $20, and ` + '`$not_math$`' + '\n\n```latex\n$also_literal$\n```';
  const math = content.mathTokens(body);
  assert.equal(math.length, 4);
  assert.deepEqual(math.map(token => token.display), [false, false, true, true]);
  const html = renderer.markdown(body, 'projects/laser', notes);
  assert.equal((html.match(/class="note-math(?: note-math-display)?"/g) || []).length, 4);
  assert.match(html, /<code>\$not_math\$<\/code>/);
  assert.match(html, /<pre><code>\$also_literal\$<\/code><\/pre>/);
  assert.match(html, /\\frac\{a_1\}\{b\}/);
  assert.match(renderer.inline('**$x^2$**', 'projects/laser', notes), /<strong><span class="note-math"/);
});

test('math does not create Markdown links and table pipes remain inside math cells', () => {
  const source = String.raw`$[x](missing.md) + \left|x\right|$ [Firmware](#/guides/electrical/firmware)`;
  assert.deepEqual(content.extractLinks(source).map(link => link.target), ['#/guides/electrical/firmware']);
  const table = renderer.markdown('| Equation | Meaning |\n| --- | --- |\n| $\\|v\\|$ | Norm |', 'projects/laser', notes);
  assert.equal((table.match(/<td /g) || []).length, 2);
  assert.match(table, />\\\|v\\\|<\/span>/);
});

test('Mermaid fences are escaped placeholders; other code fences remain literal', () => {
  const source = '```mermaid\nflowchart LR\nA["<script>alert(1)</script>"] --> B[Done]\n```\n\n~~~js\nconst price = "$5";\n~~~';
  const html = renderer.markdown(source, 'projects/laser', notes);
  assert.match(html, /<figure class="note-diagram">/);
  assert.match(html, /class="mermaid-source"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/class="note-diagram"/g) || []).length, 1);
  assert.match(html, /<pre><code>const price = &quot;\$5&quot;;<\/code><\/pre>/);
  assert.deepEqual(content.extractLinks(source), []);
});
