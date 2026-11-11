import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const referencePath=fileURLToPath(new URL('./fixtures/vault-graph.jsx',import.meta.url));
const portPath=fileURLToPath(new URL('../assets/vault-graph.js',import.meta.url));
const original=await readFile(referencePath,'utf8');
assert.equal(createHash('sha256').update(original).digest('hex'),'99fd51cfc74fc97d8ead9afc99b36a0033b4464319a307eed93eef6d250d068a','reference fixture must remain the supplied vault source');
const port=await readFile(portPath,'utf8');
// Only remove the React/module boundary and final JSX. The actual source effect,
// including initialization, numerical loop and pointer code, executes unchanged.
const adapted=original.replace(/^import[^\n]*\n/gm,'').replace('export default function Graph','function Graph').replace(/\n  return \(\n[\s\S]*$/,'\n  return {api};\n}\nglobalThis.ReferenceGraph=Graph;\n');
assert(adapted.includes('for (const a of N)'));
function harness(kind,{names,out,current,local=false,dpr=1,disconnectedRepulsion=1,onCameraChange,adaptiveLabels=false}){
 let nextId=0,timestamp=0,seed=0x12345678,callbacks=new Map(),effect,refIndex=0,api;
 const resizers=[],listeners=new Map(),opened=[];
 const math=Object.create(Math);math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const cx={commands:[],lastTransform:null,setTransform(...a){this.lastTransform=a;this.commands.push(['setTransform',...a]);},clearRect(...a){this.commands=[['setTransform',...this.lastTransform],['clearRect',...a]];},beginPath(){this.commands.push(['beginPath']);},moveTo(...a){this.commands.push(['moveTo',...a]);},lineTo(...a){this.commands.push(['lineTo',...a]);},stroke(){this.commands.push(['stroke',this.lineWidth]);},arc(...a){this.commands.push(['arc',...a]);},fill(){this.commands.push(['fill']);},fillText(text,x,y){this.commands.push(['fillText',text,x,y,this.font,this.textAlign]);},measureText(text){const size=parseFloat(this.font)||11;return{width:text.length*size*.6,actualBoundingBoxAscent:size*.8,actualBoundingBoxDescent:size*.2};}};
 const cv={clientWidth:900,clientHeight:660,width:0,height:0,style:{},getContext:()=>cx,getBoundingClientRect(){return{left:0,top:0,width:this.clientWidth,height:this.clientHeight,right:this.clientWidth,bottom:this.clientHeight};},setPointerCapture(){},addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);}};
 const title=p=>p.split('/').at(-1).replaceAll('-',' ');
 const env={Math:math,devicePixelRatio:dpr,names,out,title,tagsOf:Object.fromEntries(names.map(n=>[n,new Set(['all'])])),backlinks:p=>names.filter(n=>out[n].has(p)),useRef(value){return{current:refIndex++===0?cv:value};},useEffect(fn){effect=fn;},requestAnimationFrame(fn){callbacks.set(++nextId,fn);return nextId;},cancelAnimationFrame(id){callbacks.delete(id);},ResizeObserver:class{constructor(fn){this.fn=fn;resizers.push(this);}observe(){}disconnect(){this.disconnected=true;}},getComputedStyle:()=>({color:'#fff',getPropertyValue:key=>key==='--line'?'rgba(130,120,255,.4)':''})};
 env.window=env;
 const context=vm.createContext(env);
 let destroy;
 if(kind==='reference'){
  vm.runInContext(adapted,context,{filename:referencePath});
  const refs=context.ReferenceGraph({current,onOpen:p=>opened.push(p),local,tag:null});
  destroy=effect();api={zoom:f=>refs.api.current.zoom(f),reset:()=>refs.api.current.reset()};
 }else{
  vm.runInContext(port,context,{filename:portPath});
  api=context.JamboreeVaultGraph.create(cv,{names,out,title,current,onOpen:p=>opened.push(p),color:()=> '#fff',local,disconnectedRepulsion,onCameraChange,adaptiveLabels});destroy=api.destroy;
 }
 return{cv,cx,opened,api,advance(){const entry=callbacks.entries().next().value;assert(entry,`${kind}: no scheduled RAF`);callbacks.delete(entry[0]);entry[1](timestamp+=1000/60);},event(type,values){const e={type,pointerId:1,clientX:0,clientY:0,deltaY:0,preventDefault(){},...values};cv['on'+type]?.(e);for(const fn of listeners.get(type)||[])fn(e);},resize(w,h){cv.clientWidth=w;cv.clientHeight=h;for(const r of resizers)if(!r.disconnected)r.fn();},destroy(){destroy();assert.equal(callbacks.size,0,`${kind}: RAF not cancelled`);},commands(){return structuredClone(cx.commands);},arcs(){return cx.commands.filter(c=>c[0]==='arc').map(c=>({x:c[1],y:c[2],r:c[3]}));},world(){const c=cx.commands.filter(c=>c[0]==='setTransform').at(-1);return{k:c[1]/dpr,x:c[5]/dpr,y:c[6]/dpr};}};
}
const ids=['notes/hub','notes/a','notes/b','notes/island','other/isolated'];
const out=Object.fromEntries(ids.map(n=>[n,new Set()]));out['notes/hub']=new Set(['notes/a','notes/b']);out['notes/a']=new Set(['notes/hub']);
for(const fixture of [{name:'complete-directed-reciprocal-disconnected',names:ids,out,current:'notes/hub'},{name:'local-neighbors',names:ids,out,current:'notes/hub',local:true},{name:'complete-dpr2',names:ids,out,current:'notes/hub',dpr:2},{name:'empty',names:[],out:{},current:''}]) test(`Canvas graph exactly matches supplied vault: ${fixture.name}`,()=>{
 const a=harness('reference',fixture),b=harness('port',fixture);let comparisons=0;
 const equal=label=>{assert.deepEqual(b.commands(),a.commands(),`${fixture.name}: drawing/numeric mismatch at ${label}`);assert.equal(b.cv.width,a.cv.width);assert.equal(b.cv.height,a.cv.height);assert.deepEqual(b.opened,a.opened);comparisons++;};
 const frames=(count,label)=>{for(let i=0;i<count;i++){a.advance();b.advance();equal(`${label} frame${i+1}`);}};
 const event=(type,values)=>{a.event(type,values);b.event(type,values);};
 equal('initial synchronous draw');frames(650,'initial cooling');const settled=a.commands();frames(50,'cooled static');assert.deepEqual(a.commands(),settled,'actual vault unexpectedly drifts after cooling');
 const count=a.arcs().length;
 if(count){
  const node=a.arcs()[0],transform=a.world();const x=node.x*transform.k+transform.x,y=node.y*transform.k+transform.y;
  event('pointerdown',{pointerId:1,clientX:x,clientY:y});event('pointermove',{pointerId:1,clientX:x+70,clientY:y+35});frames(6,'held drag accumulates momentum');
  event('pointermove',{pointerId:1,clientX:x+90,clientY:y+65});frames(20,'held drag plus repulsion');
  const held=a.arcs()[0];event('pointerup',{pointerId:1,clientX:x+90,clientY:y+65});frames(1,'first release');const released=a.arcs()[0];assert(Math.hypot(released.x-held.x,released.y-held.y)>0,'actual vault did not carry momentum after release');frames(799,'release momentum/cooling');
  const click=a.arcs()[0],w=a.world();event('pointermove',{clientX:click.x*w.k+w.x,clientY:click.y*w.k+w.y});event('pointerdown',{pointerId:8,clientX:click.x*w.k+w.x,clientY:click.y*w.k+w.y});event('pointerup',{pointerId:8,clientX:click.x*w.k+w.x,clientY:click.y*w.k+w.y});frames(1,'click node');assert(a.opened.length>0,'actual click did not open');
 }
 event('pointerdown',{pointerId:2,clientX:-500,clientY:-500});event('pointermove',{pointerId:2,clientX:-450,clientY:-525});event('pointerup',{pointerId:2,clientX:-450,clientY:-525});frames(1,'background pan');
 event('wheel',{clientX:300,clientY:240,deltaY:-210});frames(1,'wheel zoom');a.api.zoom(1.3);b.api.zoom(1.3);frames(1,'button zoom');a.api.reset();b.api.reset();frames(1,'reset camera');
 event('pointerdown',{pointerId:11,clientX:40,clientY:40});event('pointerdown',{pointerId:12,clientX:140,clientY:40});event('pointermove',{pointerId:11,clientX:15,clientY:50});event('pointermove',{pointerId:12,clientX:170,clientY:50});frames(1,'two pointer pinch');event('pointerup',{pointerId:11,clientX:15,clientY:50});event('pointerup',{pointerId:12,clientX:170,clientY:50});frames(1,'pinch release');
 a.resize(640,420);b.resize(640,420);frames(650,'resize reheat and cool');a.destroy();b.destroy();
});


test('extra disconnected repulsion leaves directly and indirectly connected nodes unchanged',()=>{
 const names=['a','b','c','d'];
 const links={a:new Set(['b']),b:new Set(['c']),c:new Set(['d']),d:new Set()};
 const baseline=harness('port',{names,out:links,current:'a'});
 const boosted=harness('port',{names,out:links,current:'a',disconnectedRepulsion:1.35});
 try {
  assert.deepEqual(boosted.commands(),baseline.commands());
  for(let frame=0;frame<650;frame++) {
   baseline.advance();boosted.advance();
   assert.deepEqual(boosted.commands(),baseline.commands(),`connected chain changed at frame ${frame}`);
  }
 }finally{baseline.destroy();boosted.destroy();}
});

test('extra disconnected repulsion increases spacing between separate components and isolates',()=>{
 const names=['a','b','c','d','isolated'];
 const links={a:new Set(['b']),b:new Set(),c:new Set(['d']),d:new Set(),isolated:new Set()};
 const baseline=harness('port',{names,out:links,current:'a'});
 const boosted=harness('port',{names,out:links,current:'a',disconnectedRepulsion:1.35});
 const componentCenters=arcs=>[
  {x:(arcs[0].x+arcs[1].x)/2,y:(arcs[0].y+arcs[1].y)/2},
  {x:(arcs[2].x+arcs[3].x)/2,y:(arcs[2].y+arcs[3].y)/2},
  arcs[4],
 ];
 const meanSeparation=centers=>(Math.hypot(centers[0].x-centers[1].x,centers[0].y-centers[1].y)+Math.hypot(centers[0].x-centers[2].x,centers[0].y-centers[2].y)+Math.hypot(centers[1].x-centers[2].x,centers[1].y-centers[2].y))/3;
 try {
  for(let frame=0;frame<650;frame++){baseline.advance();boosted.advance();}
  const before=meanSeparation(componentCenters(baseline.arcs()));
  const after=meanSeparation(componentCenters(boosted.arcs()));
  assert(after>before,`disconnected spacing did not increase: ${before} -> ${after}`);
 }finally{baseline.destroy();boosted.destroy();}
});


test('camera updates follow the rendered vault transform without changing graph motion',()=>{
 const fixture={names:ids,out,current:'notes/hub'};
 const updates=[];
 const original=harness('reference',fixture);
 const observed=harness('port',{...fixture,onCameraChange:camera=>updates.push({...camera})});
 const equal=label=>{
  assert.deepEqual(observed.commands(),original.commands(),label+' changed graph rendering or motion');
  assert.deepEqual(updates.at(-1),observed.world(),label+' grid camera differs from rendered graph');
 };
 const frame=label=>{original.advance();observed.advance();equal(label);};
 const event=(type,values)=>{original.event(type,values);observed.event(type,values);};
 try {
  assert.equal(updates.length,1,'initial drawing reports its camera once');
  equal('initial');
  for(let i=0;i<12;i++)frame('node simulation');
  assert.equal(updates.length,1,'node movement alone does not move the background camera');

  event('pointerdown',{pointerId:10,clientX:-400,clientY:-400});
  event('pointermove',{pointerId:10,clientX:-340,clientY:-425});
  event('pointerup',{pointerId:10,clientX:-340,clientY:-425});
  frame('pan');
  assert.deepEqual(updates.at(-1),{k:1,x:60,y:-25});
  assert.equal(updates.length,2);

  event('wheel',{clientX:300,clientY:220,deltaY:-160});
  frame('wheel zoom');
  assert(updates.at(-1).k>1);
  assert.equal(updates.length,3);

  original.api.zoom(1.3);observed.api.zoom(1.3);frame('button zoom');
  assert.equal(updates.length,4);
  original.api.reset();observed.api.reset();frame('reset');
  assert.deepEqual(updates.at(-1),{k:1,x:0,y:0});
  assert.equal(updates.length,5);

  event('pointerdown',{pointerId:11,clientX:30,clientY:30});
  event('pointerdown',{pointerId:12,clientX:130,clientY:30});
  event('pointermove',{pointerId:11,clientX:10,clientY:40});
  event('pointermove',{pointerId:12,clientX:170,clientY:40});
  frame('pinch');
  assert(updates.at(-1).k>1);
  assert.equal(updates.length,6,'one drawing publishes the latest pinch camera once');
  event('pointerup',{pointerId:11,clientX:10,clientY:40});
  event('pointerup',{pointerId:12,clientX:170,clientY:40});
  frame('pinch release');
  assert.equal(updates.length,6);
  original.resize(640,420);observed.resize(640,420);frame('resize');
  assert.equal(updates.length,6,'viewport resize without a transform does not move world-grid coordinates');
 }finally{original.destroy();observed.destroy();}
});

test('camera callbacks receive copies rather than mutable graph state',()=>{
 const fixture={names:ids,out,current:'notes/hub'};
 const baseline=harness('port',fixture);
 let calls=0;
 const observed=harness('port',{...fixture,onCameraChange:camera=>{calls++;camera.k=99;camera.x=-1e6;camera.y=1e6;}});
 try {
  assert.equal(calls,1);
  assert.deepEqual(observed.commands(),baseline.commands(),'callback mutation changed the initial graph camera');
  baseline.api.zoom(1.3);observed.api.zoom(1.3);
  baseline.advance();observed.advance();
  assert.equal(calls,2);
  assert.deepEqual(observed.commands(),baseline.commands(),'callback mutation changed zoom or node motion');
  for(let i=0;i<12;i++){baseline.advance();observed.advance();assert.deepEqual(observed.commands(),baseline.commands());}
  assert.equal(calls,2,'mutating callback copies does not manufacture additional camera changes');
 }finally{baseline.destroy();observed.destroy();}
});

const crowdedNames=Array.from({length:24},(_,i)=>`notes/research-topic-${String(i+1).padStart(2,'0')}-assembly-and-testing`);
const crowdedFixture={names:crowdedNames,out:Object.fromEntries(crowdedNames.map(name=>[name,new Set()])),current:''};
const stateWithoutLabels=graph=>{
 const {nodes,edges,camera,alpha}=graph.api.snapshot();
 return structuredClone({nodes,edges,camera,alpha});
};
function assertClearLabels(graph,description){
 const {labels}=graph.api.snapshot();
 assert(labels.length>0,description+': all labels were hidden');
 for(const label of labels){
  assert(label.fontSize>=8.5&&label.fontSize<=15,description+': unreadable font size');
  assert(label.width>0&&label.height>0,description+': empty text bounds');
  assert(label.x>=0&&label.y>=0,description+': label outside the top/left of the viewport');
  assert(label.x+label.width<=graph.cv.clientWidth+.001,description+': label outside the right of the viewport');
  assert(label.y+label.height<=graph.cv.clientHeight+.001,description+': label outside the bottom of the viewport');
 }
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const a=labels[i],b=labels[j],gap=2-.001;
  assert(a.x+a.width+gap<=b.x||b.x+b.width+gap<=a.x||a.y+a.height+gap<=b.y||b.y+b.height+gap<=a.y,`${description}: ${a.slug} overlaps ${b.slug}`);
 }
 return structuredClone(labels);
}

test('adaptive labels shrink with zoom and retain readable collision-free screen bounds',()=>{
 const graph=harness('port',{...crowdedFixture,adaptiveLabels:true});
 try{
  for(let i=0;i<650;i++)graph.advance();
  const sizes=[];
  for(const zoom of [1,.5,.25]){
   graph.api.reset();graph.api.zoom(zoom);graph.advance();
   const labels=assertClearLabels(graph,`zoom ${zoom}`);
   sizes.push(labels[0].fontSize);
   assert.equal(graph.api.snapshot().camera.k,zoom);
   const text=graph.commands().filter(command=>command[0]==='fillText');
   assert(text.length>0,'labels must actually be painted');
   assert(text.every(command=>Math.abs(parseFloat(command[4])-labels[0].fontSize)<.001),'painted font differs from reported CSS font size');
  }
  assert.equal(sizes[0],11,'normal zoom retains the original 11px labels');
  assert(sizes[0]>sizes[1]&&sizes[1]>sizes[2],`zoomed-out labels did not shrink progressively: ${sizes}`);
 }finally{graph.destroy();}
});

test('adaptive labels leave vault simulation, camera and drag momentum unchanged',()=>{
 const fixture={names:ids,out,current:'notes/hub',disconnectedRepulsion:1.35};
 const baseline=harness('port',fixture),adaptive=harness('port',{...fixture,adaptiveLabels:true});
 const equal=description=>assert.deepEqual(stateWithoutLabels(adaptive),stateWithoutLabels(baseline),description);
 const frames=(count,description)=>{for(let i=0;i<count;i++){baseline.advance();adaptive.advance();equal(`${description} frame ${i}`);}};
 const event=(type,values)=>{baseline.event(type,values);adaptive.event(type,values);};
 try{
  equal('initial positions and forces');frames(650,'cooling');
  const node=baseline.api.snapshot().nodes[0];
  event('pointerdown',{clientX:node.x,clientY:node.y});
  event('pointermove',{clientX:node.x+70,clientY:node.y+35});frames(20,'held drag');
  event('pointerup',{clientX:node.x+70,clientY:node.y+35});frames(650,'release momentum');
  baseline.api.zoom(.5);adaptive.api.zoom(.5);frames(2,'zoom');
  event('pointerdown',{pointerId:9,clientX:-400,clientY:-400});
  event('pointermove',{pointerId:9,clientX:-350,clientY:-420});
  event('pointerup',{pointerId:9,clientX:-350,clientY:-420});frames(2,'pan');
  baseline.resize(640,420);adaptive.resize(640,420);frames(20,'resize reheat');
 }finally{baseline.destroy();adaptive.destroy();}
});

test('hover reveals the full title of a label hidden by crowding',()=>{
 const graph=harness('port',{...crowdedFixture,adaptiveLabels:true});
 try{
  for(let i=0;i<650;i++)graph.advance();
  graph.api.zoom(.5);graph.advance();
  const {nodes,labels,camera}=graph.api.snapshot(),visible=new Set(labels.map(label=>label.slug));
  assert(labels.length<nodes.length,'fixture must contain suppressed labels');
  const hidden=nodes.find(node=>!visible.has(node.slug)&&nodes.find(candidate=>Math.hypot(candidate.x-node.x,candidate.y-node.y)<14/camera.k+4)?.slug===node.slug);
  assert(hidden,'fixture needs a hidden node that can be hovered directly');
  graph.event('pointermove',{clientX:hidden.x*camera.k+camera.x,clientY:hidden.y*camera.k+camera.y});graph.advance();
  const revealed=assertClearLabels(graph,'hover').find(label=>label.slug===hidden.slug);
  assert(revealed,'hovered label remains hidden');
  assert.equal(revealed.lines.join(' '),hidden.slug.split('/').at(-1).replaceAll('-',' ').toUpperCase(),'hovered title was truncated');
 }finally{graph.destroy();}
});

test('local graph keeps the current note label visible as it zooms out',()=>{
 const current=crowdedNames.at(-1);
 const localOut=Object.fromEntries(crowdedNames.map(name=>[name,name===current?new Set(crowdedNames.slice(0,-1)):new Set()]));
 const graph=harness('port',{names:crowdedNames,out:localOut,current,local:true,adaptiveLabels:true});
 try{
  for(let i=0;i<650;i++)graph.advance();
  for(const zoom of [1,.5,.25]){
   graph.api.reset();graph.api.zoom(zoom);graph.advance();
   const labels=assertClearLabels(graph,`local zoom ${zoom}`);
   assert(labels.some(label=>label.slug===current),'current note lost its label');
  }
 }finally{graph.destroy();}
});

test('adaptive label layout uses CSS pixels independently of device pixel ratio',()=>{
 const a=harness('port',{...crowdedFixture,adaptiveLabels:true,dpr:1});
 const b=harness('port',{...crowdedFixture,adaptiveLabels:true,dpr:2});
 const equal=description=>{
  assert.deepEqual(stateWithoutLabels(a),stateWithoutLabels(b),description+': DPR changed graph state');
  assert.deepEqual(structuredClone(a.api.snapshot().labels),structuredClone(b.api.snapshot().labels),description+': DPR changed label placement');
 };
 try{
  equal('initial');
  for(let i=0;i<650;i++){a.advance();b.advance();}
  equal('cooled');a.api.zoom(.5);b.api.zoom(.5);a.advance();b.advance();equal('zoomed');
  a.resize(640,420);b.resize(640,420);a.advance();b.advance();equal('resized');
  assert.equal(b.cv.width,a.cv.width*2);
  assert.equal(b.cv.height,a.cv.height*2);
 }finally{a.destroy();b.destroy();}
});
