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

// Numerical loop copied from the supplied vault/src/components/Graph.jsx. Keep
// this oracle independent of the production step: parity covers operation order,
// dragged-node velocity accumulation, and alpha cooling after release.
function vaultReferenceStep(state, W, H) {
  const N = state.nodes.map(n => ({...n}));
  const ix = Object.fromEntries(N.map(n => [n.slug, n]));
  const E = state.edges.map(e => [ix[e.source.slug], ix[e.target.slug]]);
  const drag = ix[state.draggedSlug];
  let alpha = state.alpha;
  if (alpha > 0.03) {
    for (const a of N) {
      for (const b of N) { if (a === b) continue; const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.1, d = Math.sqrt(d2), f = 2600 / d2 * alpha; a.vx += dx / d * f; a.vy += dy / d * f }
      a.vx += (W / 2 - a.x) * 0.004 * alpha; a.vy += (H / 2 - a.y) * 0.004 * alpha
    }
    for (const [a, b] of E) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 90) * 0.02 * alpha; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f }
    for (const n of N) { if (n === drag) continue; n.vx *= 0.8; n.vy *= 0.8; n.x += n.vx; n.y += n.vy }
    if (!drag) alpha *= 0.994
  }
  return {...state, nodes:N, edges:E.map(([source,target]) => ({source,target})), alpha};
}
function physicsFixture() {
  const nodes = [
    {slug:'a',x:100,y:140,vx:.7,vy:-.2},
    {slug:'b',x:160,y:180,vx:-.4,vy:.8},
    {slug:'c',x:210,y:110,vx:.3,vy:.1},
  ];
  return {nodes,edges:[{source:nodes[0],target:nodes[1]},{source:nodes[1],target:nodes[2]}],alpha:1};
}
function equalMotion(actual, expected) {
  assert.equal(actual.alpha, expected.alpha);
  for (let i = 0; i < actual.nodes.length; i++) {
    for (const coordinate of ['x','y','vx','vy']) assert.equal(actual.nodes[i][coordinate], expected.nodes[i][coordinate], `node ${i} ${coordinate}`);
  }
}

test('base simulation matches the vault loop exactly through cooling, dragging, and release', () => {
  let actual = physicsFixture(), expected = physicsFixture();
  for (let frame = 0; frame < 800; frame++) {
    const draggedSlug = frame >= 40 && frame < 70 ? 'b' : undefined;
    actual.draggedSlug = expected.draggedSlug = draggedSlug;
    if (draggedSlug) {
      actual.nodes[1].x = expected.nodes[1].x = 200 + (frame - 40) * 2;
      actual.nodes[1].y = expected.nodes[1].y = 60;
      if (frame === 40) actual.alpha = expected.alpha = 1;
    }
    const before = JSON.stringify(actual);
    const next = graph.simulationStep(actual, 320, 320);
    assert.equal(JSON.stringify(actual), before, 'the numerical step does not mutate its input');
    actual = next;
    expected = vaultReferenceStep(expected, 320, 320);
    equalMotion(actual,expected);
  }
  assert(actual.alpha <= .03);
});

test('drag holds coordinates and accumulates reference velocity, then releases without clearing momentum', () => {
  let state = {...physicsFixture(),draggedSlug:'b'};
  const held = {x:state.nodes[1].x,y:state.nodes[1].y};
  for (let frame = 0; frame < 20; frame++) state = graph.simulationStep(state,320,320);
  assert.equal(state.alpha,1);
  assert.equal(state.nodes[1].x,held.x);
  assert.equal(state.nodes[1].y,held.y);
  assert(Math.hypot(state.nodes[1].vx,state.nodes[1].vy) > 1);
  state.draggedSlug = undefined;
  const released = graph.simulationStep(state,320,320);
  equalMotion(released,vaultReferenceStep(state,320,320));
  assert.equal(released.alpha,.994);
  assert(Math.hypot(released.nodes[1].x-held.x,released.nodes[1].y-held.y)>0);
});

test('local initialization centers the viewed note and spaces neighbors at equal angles', () => {
  const data = graph.initialize(graph.localModel(notes,'projects/laser'),320,320);
  const current = data.nodes.find(n=>n.slug==='projects/laser');
  assert.equal(current.x,160); assert.equal(current.y,160);
  const angles = [];
  for (const n of data.nodes) {
    if (n===current) continue;
    assert(Math.abs(Math.hypot(n.x-160,n.y-160)-90)<1e-10);
    angles.push(Math.atan2(n.y-160,n.x-160));
  }
  angles.sort((a,b)=>a-b);
  for (let i=0;i<angles.length;i++) {
    const gap=(angles[(i+1)%angles.length]-angles[i]+Math.PI*2)%(Math.PI*2);
    assert(Math.abs(gap-Math.PI*2/angles.length)<1e-10);
  }
});

test('local node sizes retain complete-graph connection counts', () => {
  const complete = graph.model(notes), local = graph.localModel(notes,'projects/laser');
  const hub = local.nodes.find(n=>n.slug==='projects/index');
  assert.equal(hub.degree,complete.nodes.find(n=>n.slug===hub.slug).degree);
  assert(hub.degree>local.edges.filter(e=>e.source.slug===hub.slug||e.target.slug===hub.slug).length);
});

test('the local-only focal anchor stays centered and returns smoothly after dragging', () => {
  let state = {...graph.initialize(graph.localModel(notes,'projects/laser'),320,320),alpha:1};
  for (let frame=0;frame<100;frame++) state=graph.simulationStep(state,320,320);
  let current=state.nodes.find(n=>n.slug==='projects/laser');
  assert.equal(current.x,160); assert.equal(current.y,160);
  current.x=260; current.y=210;
  state.alpha=1; state.draggedSlug=state.currentSlug;
  for(let frame=0;frame<10;frame++) state=graph.simulationStep(state,320,320);
  current=state.nodes.find(n=>n.slug==='projects/laser');
  const held={...current};
  state.draggedSlug=undefined; state.anchorReturning=true;
  state=graph.simulationStep(state,320,320);
  current=state.nodes.find(n=>n.slug==='projects/laser');
  assert.equal(current.x,held.x+(held.vx+(160-held.x)*.004)*.8);
  assert.equal(current.y,held.y+(held.vy+(160-held.y)*.004)*.8);
  assert(Math.hypot(current.x-160,current.y-160)>1,'release does not snap to the center');
  for(let frame=0;frame<1000;frame++) state=graph.simulationStep(state,320,320);
  current=state.nodes.find(n=>n.slug==='projects/laser');
  assert.equal(current.x,160); assert.equal(current.y,160);
  assert.equal(state.anchorReturning,false);
  assert.equal(current.vx,0); assert.equal(current.vy,0);
});
