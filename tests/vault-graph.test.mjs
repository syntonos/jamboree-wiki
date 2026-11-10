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
function harness(kind,{names,out,current,local=false,dpr=1}){
 let nextId=0,timestamp=0,seed=0x12345678,callbacks=new Map(),effect,refIndex=0,api;
 const resizers=[],listeners=new Map(),opened=[];
 const math=Object.create(Math);math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const cx={commands:[],lastTransform:null,setTransform(...a){this.lastTransform=a;this.commands.push(['setTransform',...a]);},clearRect(...a){this.commands=[['setTransform',...this.lastTransform],['clearRect',...a]];},beginPath(){this.commands.push(['beginPath']);},moveTo(...a){this.commands.push(['moveTo',...a]);},lineTo(...a){this.commands.push(['lineTo',...a]);},stroke(){this.commands.push(['stroke',this.lineWidth]);},arc(...a){this.commands.push(['arc',...a]);},fill(){this.commands.push(['fill']);},fillText(text,x,y){this.commands.push(['fillText',text,x,y,this.font,this.textAlign]);}};
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
  api=context.JamboreeVaultGraph.create(cv,{names,out,title,current,onOpen:p=>opened.push(p),color:()=> '#fff',local});destroy=api.destroy;
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
