// Add the club's channel/profile URLs when they are available.
const SOCIAL_LINKS = {
  youtube: '',
  instagram: '',
  github: 'https://github.com/syntonos/jamboree-wiki'
};
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let notes=[];const link=n=>'#/'+(n.slug==='index'?'':n.slug);
const drawings={laser:'<path d="m45 65 60-23 58 18-9 20-44 9-12 30-20-6 9-29-42-4z"/><path d="m105 42 3 42m-63-19 63 19 55-24M57 58l45 15m17-20 29 9m-60 22 12 5m10 0 32-11"/><circle cx="132" cy="69" r="6"/><path stroke-dasharray="3 4" d="M22 130h165M23 30v100m162-90v90"/>',synth:'<path d="m31 70 140-19 21 52-140 19zM31 70l3 25 18 27m0-24 140-19M55 99l137-20"/><path d="m68 98 6 20m13-22 6 20m13-23 6 21m13-24 6 21m13-24 6 21m13-24 6 21"/><circle cx="64" cy="77" r="5"/><circle cx="86" cy="74" r="5"/><circle cx="109" cy="71" r="5"/><path d="m130 66 28-4 4 12-28 4zM32 44l137-19" stroke-dasharray="3 4"/>',cart:'<ellipse cx="56" cy="107" rx="12" ry="20"/><ellipse cx="168" cy="94" rx="12" ry="20"/><ellipse cx="76" cy="66" rx="9" ry="16"/><ellipse cx="177" cy="56" rx="9" ry="16"/><path d="m55 100 21-34 100-10-9 38-112 6 83-21 38-23m-92 40 8-36 36-5 13 29m-47-13 28-5m-7-3 7-15m-8 1 18-3M61 107l108-13"/><path d="M28 138h165m-160-6v12m160-12v12" stroke-dasharray="3 4"/>',trebuchet:'<path d="m52 124 53-74 53 74zM81 124l24-74 22 74M105 50l47-30m-47 30L62 79m90-59 17 43m-12-1 23 3-8 15-15-3zM42 124h126"/><circle cx="105" cy="50" r="6"/><path stroke-dasharray="3 4" d="M40 44q90-90 148 39"/>'};
function art(kind='cart',label='CONCEPT STUDY / NOT TO SCALE',image=''){return `<div class="drawing">${image?`<img src="${esc(image)}" alt="Project feature photo" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><svg hidden viewBox="0 0 220 160" fill="none" stroke="currentColor">${drawings[kind]||drawings.cart}</svg>`:`<svg viewBox="0 0 220 160" fill="none" stroke="currentColor" stroke-width="1.2">${drawings[kind]||drawings.cart}</svg>`}<span class="drawing-label">${esc(label)}</span></div>`}
function project(n){return `<a class="project-card" href="${link(n)}">${art(n.art,`FIG. ${n.order||'01'} / ${n.title.toUpperCase()}`,n.image)}<div class="project-body"><div class="project-meta"><span>● ${esc(n.status).toUpperCase()}</span><span>JMB—${esc(n.order||'01')}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.description)}</p><div class="project-bottom"><span>${esc(n.discipline||'Club project')}</span><span>→</span></div></div></a>`}
const guideInfo=[['design-practices','Design practices','A better process, from the first question.','⌖'],['mechanical','Mechanical','CAD, simulation, tools & materials.','⚙'],['electrical','Electrical','Circuits, PCBs, chips & firmware.','⏚'],['cs','Computer science','Code, systems & everything between.','⌘']];
function guides(){return `<div class="guide-grid">${guideInfo.map(([slug,title,desc,icon])=>`<a class="guide-card" href="#/guides/${slug}"><span class="guide-icon">${icon}</span><div><h3>${title}</h3><p>${desc}</p></div><span>→</span></a>`).join('')}</div>`}
function heading(id,num,title,more=''){return `<div class="section-heading" id="${id}"><h2><span>${num} /</span>${title}</h2>${more}</div>`}
function home(){return `<section class="hero" id="welcome"><div class="eyebrow">A PLACE TO THINK WITH YOUR HANDS</div><h1>The workshop<br>is open<span style="color:var(--blue)">.</span></h1><p>A shared fieldbook for people who make things. Explore our projects, browse the guides, and see what’s on the workbench.</p><div class="intro-links"><a href="#/projects/index">Explore projects →</a><a href="#/about">Meet Jamboree →</a></div><div class="hero-art"><svg viewBox="0 0 240 220" fill="none" stroke="currentColor" stroke-width=".8"><defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0v16" opacity=".15"/></pattern></defs><path fill="url(#grid)" stroke="none" d="M0 0h240v220H0z"/><g transform="translate(15 30)"><path d="m90 12 82 46v76l-82 46-71-43V58zM19 58l71 43 82-43m-82 43v79M90 12v76m0 0 67 40m-67-40-60 39"/><ellipse cx="94" cy="70" rx="32" ry="17"/><path d="M62 70v40q32 30 64 0V70M62 110q32-27 64 0"/><path d="M0 161l74 44m106-56-83 48M0 155v12m74 32v12m102-67 8 10M18 20h153" stroke-dasharray="3 4"/><text x="80" y="210" fill="currentColor" stroke="none" font-size="7" font-family="monospace">FIG. 001 / IDEAS IN ASSEMBLY</text><path d="m178 25 8-8m-8 0 8 8M0 0h8m-4-4v8"/></g></svg></div></section>${heading('projects','01','On the workbench','<a href="#/projects/index">All projects →</a>')}<p class="section-description">A few things we’re figuring out, together.</p><div class="projects-grid">${notes.filter(n=>n.type==='project'&&n.status==='current'&&n.featured==='true').sort((a,b)=>Number(a.order)-Number(b.order)).map(project).join('')||'<p>No featured projects yet.</p>'}</div>${heading('guides','02','The shared toolkit','<a href="#/guides/index">All guides →</a>')}<p class="section-description">Knowledge to get you started. Notes to keep you going.</p>${guides()}`}
function inline(t){return esc(t).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>{let u=/^https?:\/\//.test(url)?url:'#/'+url.replace(/\.md$/,'');return `<a href="${esc(u)}">${label}</a>`})}
function markdown(body){let ul=false;let result='';for(let l of body.split('\n')){if(!l.trim()){if(ul){result+='</ul>';ul=false}continue}if(l.startsWith('- ')){if(!ul){result+='<ul>';ul=true}result+='<li>'+inline(l.slice(2))+'</li>';continue}if(ul){result+='</ul>';ul=false}let h=l.match(/^(#{1,3}) (.*)/);result+=h?`<h${h[1].length} id="${esc(h[2].toLowerCase().replace(/\W+/g,'-'))}">${inline(h[2])}</h${h[1].length}>`:`<p>${inline(l)}</p>`}return result+(ul?'</ul>':'')}
function article(n){let body='';if(n.hub==='projects'){for(let [s,t]of [['current','Current projects'],['past','Past projects'],['future','Future projects']]){let list=notes.filter(p=>p.type==='project'&&p.status===s);body+=heading(s,'›',t)+ (list.length?`<div class="projects-grid">${list.map(project).join('')}</div>`:`<div class="empty">${s==='past'?'The archive is waiting for its first finished build.':'The next ideas and planned builds will appear here.'}</div>`)}}else if(n.hub==='guides')body=guides();else{let children=notes.filter(p=>p.slug.startsWith(n.slug+'/'));if(children.length)body=`<div class="guide-grid">${children.map(p=>`<a class="guide-card" href="${link(p)}"><span class="guide-icon">›</span><div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></div><span>→</span></a>`).join('')}</div>`;body+=`<div class="article-body">${markdown(n.body)}</div>`}return `<article class="article"><div class="eyebrow">FIELDBOOK / ${esc(n.type==='project'?n.status+' PROJECT':n.slug.split('/')[0]).toUpperCase()}</div><h1>${esc(n.title)}</h1><p class="description">${esc(n.description)}</p>${n.type==='project'?art(n.art,'CONCEPT DRAWING / PHOTO COMING SOON',n.image):''}${body}</article>`}
function graph(slug){let root=notes.find(n=>n.slug===slug),related=notes.filter(n=>n.slug!==slug&&(slug==='index'?['projects/index','guides/index','about','guides/mechanical','guides/electrical'].includes(n.slug):n.slug.startsWith(slug+'/')||slug.startsWith(n.slug.replace(/\/index$/,'')+'/'))).slice(0,7);if(!related.length)related=notes.filter(n=>['projects/index','guides/index','index'].includes(n.slug));$('#graph').innerHTML=related.map((n,i)=>{let a=i/related.length*Math.PI*2,x=115+75*Math.cos(a),y=95+65*Math.sin(a);return `<line x1="115" y1="95" x2="${x}" y2="${y}"/><a href="${link(n)}" aria-label="${esc(n.title)}"><title>${esc(n.title)}</title><circle cx="${x}" cy="${y}" r="4"/><text x="${x}" y="${y+15}" text-anchor="middle">${esc(n.title.length>17?n.title.slice(0,15)+'…':n.title)}</text></a>`}).join('')+'<circle cx="115" cy="95" r="7"/><text x="115" y="78" text-anchor="middle">'+esc(slug==='index'?'jamboree':root?.title||'Note')+'</text>'}
function render(){let slug=decodeURIComponent(location.hash.slice(2)||'index');let n=notes.find(n=>n.slug===slug);const isGraph=slug==='graph';window.JamboreeGraph.destroy();$('.shell').classList.toggle('graph-view',isGraph);$('#main').innerHTML=isGraph?window.JamboreeGraph.markup(notes):n?(slug==='index'?home():article(n)):'<h1>Note not found</h1><p><a href="#/">Return to the fieldbook →</a></p>';document.title=(slug==='index'?'Open engineering fieldbook':(isGraph?'Complete graph':n?.title)||'Not found')+' — Jamboree';$('#crumb').textContent=slug==='index'?'Overview':(isGraph?'Complete graph':n?.title)||'Not found';document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===(slug==='index'?'index':slug.split('/')[0])));$('#toc').innerHTML=[...$('#main').querySelectorAll('[id]')].filter(x=>x.tagName==='H2'||x.classList.contains('section-heading')||x.tagName==='SECTION').map(x=>`<a href="#" data-section="${x.id}">${esc(x.querySelector('h2')?.textContent.replace(/^.*?\//,'')||x.textContent.split('\n')[0].slice(0,28))}</a>`).join('');if(slug==='index')$('#toc').innerHTML='<a data-section="welcome" href="#">Welcome to Jamboree</a><a data-section="projects" href="#">On the workbench</a><a data-section="guides" href="#">The shared toolkit</a>';$('#toc').querySelectorAll('a').forEach(a=>a.onclick=e=>{e.preventDefault();document.getElementById(a.dataset.section)?.scrollIntoView({behavior:'smooth'})});if(isGraph){$('#toc').innerHTML='';window.JamboreeGraph.mount(notes);}else{graph(slug);}$('#search').value='';$('#search-results').innerHTML='';window.scrollTo(0,0)}
$('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();$('#search-results').innerHTML=q?(notes.filter(n=>(n.title+' '+n.description+' '+n.body).toLowerCase().includes(q)).slice(0,8).map(n=>`<a href="${link(n)}">${esc(n.title)} <small>— ${esc(n.slug)}</small></a>`).join('')||'<p style="padding:12px">No matching notes.</p>'):''});const mobileLayout = window.matchMedia('(max-width: 760px)');
const menuToggle = $('#menu-toggle');
function setMenu(open, returnFocus = false) {
  const expanded = mobileLayout.matches && open;
  $('.sidebar').classList.toggle('menu-is-open', expanded);
  menuToggle.setAttribute('aria-expanded', String(expanded));
  menuToggle.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
  if (returnFocus && mobileLayout.matches) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});
mobileLayout.addEventListener('change', () => setMenu(false));
$('#sidebar-menu').addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
$('.brand').addEventListener('click', () => setMenu(false));
$('.search-trigger').addEventListener('click', () => {
  setMenu(false);
  $('#search').focus();
});
document.addEventListener('click', event => {
  if (mobileLayout.matches && !event.target.closest('.sidebar, dialog')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !$('#social-dialog').open) {
    event.preventDefault();
    setMenu(false);
    $('#search').focus();
  }
  if (event.key === 'Escape') {
    $('#search').value = '';
    $('#search-results').innerHTML = '';
    $('#search').blur();
    if (menuToggle.getAttribute('aria-expanded') === 'true' && !$('#social-dialog').open) setMenu(false, true);
  }
});
function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  $('#theme').setAttribute('aria-label', label);
  $('#theme').setAttribute('title', label);
  $('#theme').setAttribute('aria-pressed', String(dark));
}
setTheme(localStorage.getItem('jamboree-theme') === 'dark');
$('#theme').addEventListener('click', () => {
  const dark = !document.body.classList.contains('dark');
  setTheme(dark);
  localStorage.setItem('jamboree-theme', dark ? 'dark' : 'light');
});
const socialNames = { youtube: 'YouTube', instagram: 'Instagram', github: 'GitHub' };
document.querySelectorAll('[data-social]').forEach(control => {
  const platform = control.dataset.social;
  const url = SOCIAL_LINKS[platform];
  if (url && control.tagName === 'BUTTON') {
    const anchor = document.createElement('a');
    [...control.attributes].forEach(attribute => {
      if (attribute.name !== 'type') anchor.setAttribute(attribute.name, attribute.value);
    });
    anchor.innerHTML = control.innerHTML;
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    control.replaceWith(anchor);
  } else if (url) {
    control.href = url;
  } else {
    if (control.tagName === 'A') {
      const button = document.createElement('button');
      [...control.attributes].forEach(attribute => {
        if (!['href', 'target', 'rel'].includes(attribute.name)) button.setAttribute(attribute.name, attribute.value);
      });
      button.type = 'button';
      button.innerHTML = control.innerHTML;
      control.replaceWith(button);
      control = button;
    }
    control.setAttribute('title', socialNames[platform] + ' — link coming soon');
    control.addEventListener('click', () => {
      $('#social-dialog-title').textContent = socialNames[platform];
      $('#social-dialog-description').textContent = 'Our ' + socialNames[platform] + ' link is coming soon.';
      $('#social-dialog').showModal();
    });
  }
});
$('#close-social-dialog').addEventListener('click', () => $('#social-dialog').close());
$('#social-dialog').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
});
window.addEventListener('hashchange', () => { setMenu(false); render(); });
fetch('assets/notes.json').then(response => {
  if (!response.ok) throw Error('Notes could not load');
  return response.json();
}).then(data => { notes = data; render(); }).catch(error => {
  $('#main').textContent = error.message + '. Run npm run build, then serve this folder over HTTP.';
});
