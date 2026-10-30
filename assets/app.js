// Shared destination for the title and Meet the team links. Set when the main site is available.
const MAIN_SITE_URL = '';
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
function project(n) {
  return `<a class="project-card" href="${link(n)}">${art(n.art,`FIG. ${n.order||'01'} / ${n.title.toUpperCase()}`,n.image)}<div class="project-body"><div class="project-meta"><span>● ${esc(n.status).toUpperCase()}</span><span>JMB—${esc(n.order||'01')}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.description)}</p>${window.JamboreeNotes.tags(n)}<div class="project-card-details"><span>Lead: ${esc(n.lead || 'Unassigned')}</span>${n.updated ? `<time datetime="${esc(n.updated)}">${esc(n.updated)}</time>` : ''}</div><div class="project-bottom"><span>${esc(n.discipline||'Club project')}</span><span>→</span></div></div></a>`;
}
const guideInfo=[['design-practices','Design practices','Requirements, reviews, testing & documentation.','⌖'],['mechanical','Mechanical','CAD, simulation, tools & materials.','⚙'],['electrical','Electrical','Circuits, PCBs, chips & firmware.','⏚'],['cs','Computer science','Programming, version control & testing.','⌘']];
function guides(){return `<div class="guide-grid">${guideInfo.map(([slug,title,desc,icon])=>`<a class="guide-card" href="#/guides/${slug}"><span class="guide-icon">${icon}</span><div><h3>${title}</h3><p>${desc}</p></div><span>→</span></a>`).join('')}</div>`}
function heading(id,num,title,more=''){return `<div class="section-heading" id="${esc(id)}"><h2><span>${esc(num)} /</span>${esc(title)}</h2>${more}</div>`}
function home(){return `<section class="hero" id="welcome"><h1>Jamboree wiki</h1><p>Projects, guides, and engineering notes.</p><div class="intro-links"><a href="#/projects/index">Explore projects →</a><a href="${esc(MAIN_SITE_URL || '#/main-site')}" data-main-site>Meet the team →</a></div><div class="hero-art"><svg viewBox="0 0 240 220" fill="none" stroke="currentColor" stroke-width=".8"><defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0v16" opacity=".15"/></pattern></defs><path fill="url(#grid)" stroke="none" d="M0 0h240v220H0z"/><g transform="translate(15 30)"><path d="m90 12 82 46v76l-82 46-71-43V58zM19 58l71 43 82-43m-82 43v79M90 12v76m0 0 67 40m-67-40-60 39"/><ellipse cx="94" cy="70" rx="32" ry="17"/><path d="M62 70v40q32 30 64 0V70M62 110q32-27 64 0"/><path d="M0 161l74 44m106-56-83 48M0 155v12m74 32v12m102-67 8 10M18 20h153" stroke-dasharray="3 4"/><text x="80" y="210" fill="currentColor" stroke="none" font-size="7" font-family="monospace">FIG. 001 / ASSEMBLY STUDY</text><path d="m178 25 8-8m-8 0 8 8M0 0h8m-4-4v8"/></g></svg></div></section>${heading('projects','01','Featured projects','<a href="#/projects/index">All projects →</a>')}<div class="projects-grid">${notes.filter(n=>n.type==='project'&&n.status==='current'&&n.featured==='true').sort((a,b)=>Number(a.order)-Number(b.order)).map(project).join('')||'<p>No featured projects yet.</p>'}</div>${heading('guides','02','Guides','<a href="#/guides/index">All guides →</a>')}${guides()}`}
function markdown(body, slug) { return window.JamboreeNotes.markdown(body, slug, notes); }
function projectGroups(filters) {
  const projects = window.JamboreeProjects;
  const matches = notes.filter(note => projects.matches(note, filters));
  if (!matches.length && projects.isActive(filters)) return '<div class="project-empty" role="status"><p>No projects match these filters.</p><button type="button" data-filter-reset>Reset filters</button></div>';
  const statuses = filters.status ? [filters.status] : [...new Set(['current','past','future',...matches.map(note => note.status)])];
  const titles = {current:'Current projects',past:'Past projects',future:'Future projects'};
  return statuses.map(status => {
    const statusKey = String(status).toLowerCase();
    const group = matches.filter(note => String(note.status).toLowerCase() === statusKey).sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
    return heading(statusKey,'›',titles[statusKey] || status + ' projects') + (group.length ? '<div class="projects-grid">' + group.map(project).join('') + '</div>' : '<div class="empty">No ' + esc(status) + ' projects yet.</div>');
  }).join('');
}
function projectHub() {
  const filters = window.JamboreeProjects.getFilters();
  return '<div class="project-hub">' + window.JamboreeProjects.controls(notes,filters) + '<p class="project-results-summary" aria-live="polite"></p><div class="project-groups">' + projectGroups(filters) + '</div></div>';
}
function mountProjectHub() {
  const hub = $('.project-hub');
  if (!hub) return;
  const projects = window.JamboreeProjects;
  function refresh(filters) {
    const total = notes.filter(note => note.type === 'project').length;
    const count = notes.filter(note => projects.matches(note,filters)).length;
    hub.querySelector('.project-results-summary').textContent = count + ' of ' + total + ' projects';
    hub.querySelector('.project-groups').innerHTML = projectGroups(filters);
    projects.enhanceControls(hub);
    updateToc('projects/index');
  }
  hub.addEventListener('change', event => {
    if (!event.target.matches('[data-filter]')) return;
    const filters = projects.readFilters(hub);
    projects.writeFilters(filters);
    refresh(filters);
  });
  hub.addEventListener('click', event => {
    if (!event.target.closest('[data-filter-reset]')) return;
    const filters = {status:'',discipline:'',tag:''};
    hub.querySelectorAll('[data-filter]').forEach(select => { select.value=''; });
    projects.writeFilters(filters);
    refresh(filters);
  });
  refresh(projects.getFilters());
}
function article(n) {
  let body = '';
  if (n.hub === 'projects') body = projectHub();
  else if (n.hub === 'guides') body = guides();
  else {
    const children = notes.filter(note => note.slug.startsWith(n.slug+'/'));
    if (children.length) body = '<div class="guide-grid">' + children.map(note => `<a class="guide-card" href="${link(note)}"><span class="guide-icon">›</span><div><h3>${esc(note.title)}</h3><p>${esc(note.description)}</p></div><span>→</span></a>`).join('') + '</div>';
    body += '<div class="article-body">' + markdown(n.body,n.slug) + '</div>';
  }
  return `<article class="article"><div class="eyebrow">WIKI / ${esc(n.type === 'project' ? n.status + ' PROJECT' : n.slug.split('/')[0]).toUpperCase()}</div><h1>${esc(n.title)}</h1><p class="description">${esc(n.description)}</p>${n.type === 'project' ? window.JamboreeNotes.facts(n) + art(n.art,'CONCEPT DRAWING',n.image) : ''}${body}${window.JamboreeNotes.backlinks(n,notes)}</article>`;
}
function graph(slug) { window.JamboreeGraph.mountLocal(notes,slug); }
function routeInfo() {
  const parts = location.hash.replace(/^#\//,'').split('#');
  try { return {slug: decodeURIComponent(parts[0] || 'index'), anchor: decodeURIComponent(parts.slice(1).join('#'))}; }
  catch { return {slug:'invalid-route', anchor:''}; }
}
function anchorTarget(anchor) {
  return [...$('#main').querySelectorAll('[data-heading-id], [id]')].find(element => element.dataset.headingId === anchor || element.id === anchor);
}
function updateToc(slug) {
  const toc = $('#toc');
  const entries = slug === 'index' ? [{id:'welcome',text:'Overview'},{id:'projects',text:'Featured projects'},{id:'guides',text:'Guides'}] : [
    ...[...$('#main').querySelectorAll('.section-heading[id]')].map(element => ({id:element.id,text:element.querySelector('h2').textContent.replace(/^.*?\//,'').trim()})),
    ...[...$('#main').querySelectorAll('[data-heading-id]')].map(element => ({id:element.dataset.headingId,text:element.textContent})),
    ...($('#main').querySelector('.article-backlinks') ? [{id:'linked-from',text:'Linked from'}] : [])
  ];
  toc.innerHTML = entries.map(entry => `<a href="#/${slug === 'index' ? '' : esc(slug)}#${encodeURIComponent(entry.id)}" data-section="${esc(entry.id)}">${esc(entry.text)}</a>`).join('');
  toc.querySelectorAll('a').forEach(anchor => anchor.addEventListener('click',event => {
    event.preventDefault();
    anchorTarget(anchor.dataset.section)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    history.replaceState(history.state,'',location.pathname+location.search+anchor.getAttribute('href'));
  }));
}
function render() {
  const {slug,anchor} = routeInfo();
  const note = notes.find(note => note.slug === slug);
  const isGraph = slug === 'graph', isMainSite = slug === 'main-site';
  window.JamboreeGraph.destroy();
  $('.shell').classList.toggle('graph-view',isGraph);
  $('.shell').classList.toggle('main-site-view',isMainSite);
  syncSidebars();
  $('#main').innerHTML = isMainSite ? '<article class="article main-site-placeholder"><h1>Jamboree</h1><p>Main site link coming soon.</p><a href="#/">Open wiki →</a></article>' : isGraph ? window.JamboreeGraph.markup(notes) : note ? slug === 'index' ? home() : article(note) : '<h1>Note not found</h1><p><a href="#/">Return to the wiki →</a></p>';
  const title = slug === 'index' ? 'Overview' : isMainSite ? 'Main site' : isGraph ? 'Complete graph' : note?.title || 'Not found';
  document.title = title + ' — Jamboree';
  $('#crumb').textContent = title;
  document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('active',item.dataset.nav === (slug === 'index' ? 'index' : slug.split('/')[0])));
  const projectCount = notes.filter(note => note.type === 'project').length;
  document.querySelector('[data-nav="projects"] small').textContent = String(projectCount).padStart(2,'0');
  updateToc(slug);
  if (isGraph) { $('#toc').innerHTML = ''; window.JamboreeGraph.mount(notes); }
  else if (!isMainSite) { mountProjectHub(); graph(slug); }
  $('#search').value = '';
  $('#search-results').innerHTML = '';
  if (anchor) requestAnimationFrame(() => anchorTarget(anchor)?.scrollIntoView());
  else window.scrollTo(0,0);
}
$('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();$('#search-results').innerHTML=q?(notes.filter(n=>(n.title+' '+n.description+' '+n.body).toLowerCase().includes(q)).slice(0,8).map(n=>`<a href="${link(n)}">${esc(n.title)} <small>— ${esc(n.slug)}</small></a>`).join('')||'<p style="padding:12px">No matching notes.</p>'):''});$('#main').addEventListener('click', event => {
  const anchor = event.target.closest('a');
  const href = anchor?.getAttribute('href') || '';
  if (!href.startsWith('#/') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const parts = href.slice(2).split('#');
  try {
    const slug = decodeURIComponent(parts[0] || 'index');
    const heading = decodeURIComponent(parts.slice(1).join('#'));
    if (slug !== routeInfo().slug || !heading) return;
    event.preventDefault();
    history.pushState(history.state,'',location.pathname+location.search+href);
    anchorTarget(heading)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  } catch {}
});
const mobileLayout = window.matchMedia('(max-width: 760px)');
const menuToggle = $('#menu-toggle');
const compactNotes = window.matchMedia('(max-width: 1250px)');
let navigationClosed = localStorage.getItem('jamboree-navigation-closed') === 'true';
let notesClosed = localStorage.getItem('jamboree-notes-closed') === 'true';
let notesDrawerOpen = false;
function syncSidebars() {
  const leftHidden = !mobileLayout.matches && navigationClosed;
  document.body.classList.toggle('left-sidebar-collapsed', leftHidden);
  $('#left-sidebar-toggle').setAttribute('aria-expanded', String(!leftHidden));
  const navigationLabel = (leftHidden ? 'Open' : 'Close') + ' navigation sidebar';
  $('#left-sidebar-toggle').setAttribute('aria-label', navigationLabel);
  $('#left-sidebar-toggle').title = navigationLabel;
  const hasNotes = !$('.shell').matches('.graph-view, .main-site-view');
  const notesVisible = hasNotes && (compactNotes.matches ? notesDrawerOpen : !notesClosed);
  document.body.classList.toggle('right-sidebar-collapsed', !compactNotes.matches && notesClosed);
  document.body.classList.toggle('right-sidebar-open', compactNotes.matches && notesVisible);
  $('#notes-sidebar').inert = !notesVisible;
  const modalNotes = compactNotes.matches && notesVisible;
  $('#wiki-sidebar').inert = leftHidden || modalNotes;
  $('header').inert = modalNotes;
  $('#main').inert = modalNotes;
  $('footer').inert = modalNotes;
  if (modalNotes) {
    $('#notes-sidebar').setAttribute('role', 'dialog');
    $('#notes-sidebar').setAttribute('aria-modal', 'true');
  } else {
    $('#notes-sidebar').removeAttribute('role');
    $('#notes-sidebar').removeAttribute('aria-modal');
  }
  const toggle = $('#right-sidebar-toggle');
  toggle.hidden = !hasNotes;
  toggle.setAttribute('aria-expanded', String(notesVisible));
  const label = (notesVisible ? 'Close' : 'Open') + ' notes sidebar';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  $('#sidebar-backdrop').hidden = !compactNotes.matches || !notesVisible;
}
function setNavigationClosed(closed, focus = false) {
  navigationClosed = closed;
  localStorage.setItem('jamboree-navigation-closed', String(closed));
  syncSidebars();
  if (focus) $('#left-sidebar-toggle').focus();
}
function setNotesOpen(open, focus = false) {
  if (compactNotes.matches) notesDrawerOpen = open;
  else {
    notesClosed = !open;
    localStorage.setItem('jamboree-notes-closed', String(!open));
  }
  syncSidebars();
  if (focus) $(open && compactNotes.matches ? '#close-right-sidebar' : '#right-sidebar-toggle').focus();
}
$('#left-sidebar-toggle').addEventListener('click', () => setNavigationClosed(!navigationClosed, true));
$('#right-sidebar-toggle').addEventListener('click', () => setNotesOpen($('#right-sidebar-toggle').getAttribute('aria-expanded') !== 'true', true));
$('#close-right-sidebar').addEventListener('click', () => setNotesOpen(false, true));
$('#sidebar-backdrop').addEventListener('click', () => setNotesOpen(false, true));
$('#notes-sidebar').addEventListener('click', event => {
  const anchor = event.target.closest('a');
  if (!compactNotes.matches || !anchor) return;
  setNotesOpen(false);
  const target = anchor.dataset.section ? anchorTarget(anchor.dataset.section) : null;
  if (target) {
    const previousTabindex = target.getAttribute('tabindex');
    target.setAttribute('tabindex', '-1');
    target.focus({preventScroll:true});
    target.addEventListener('blur', () => previousTabindex === null ? target.removeAttribute('tabindex') : target.setAttribute('tabindex', previousTabindex), {once:true});
  }
});
compactNotes.addEventListener('change', () => { notesDrawerOpen = false; syncSidebars(); });
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
mobileLayout.addEventListener('change', () => { setMenu(false); syncSidebars(); });
$('#sidebar-menu').addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
$('.brand').addEventListener('click', () => setMenu(false));
document.addEventListener('click', event => {
  if (mobileLayout.matches && !event.target.closest('.sidebar, dialog')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Tab' && notesDrawerOpen && compactNotes.matches) {
    const items = [...$('#notes-sidebar').querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => item.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !$('#notes-sidebar').contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !$('#notes-sidebar').contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
  }
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !$('#social-dialog').open) {
    event.preventDefault();
    if (notesDrawerOpen) setNotesOpen(false);
    if (!mobileLayout.matches && navigationClosed) setNavigationClosed(false);
    setMenu(mobileLayout.matches);
    $('#search').focus();
  }
  if (event.key === 'Escape') {
    if (notesDrawerOpen) { setNotesOpen(false, true); return; }
    $('#search').value = '';
    $('#search-results').innerHTML = '';
    $('#search').blur();
    if (menuToggle.getAttribute('aria-expanded') === 'true' && !$('#social-dialog').open) setMenu(false, true);
  }
});
syncSidebars();
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
document.querySelectorAll('[data-main-site]').forEach(anchor => { anchor.href = MAIN_SITE_URL || '#/main-site'; });
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
