(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href = note => '#/' + (note.slug === 'index' ? '' : note.slug);
  let engineCleanup = () => {};
  let viewCleanup = () => {};

  const {model, localModel} = window.JamboreeGraphData;

  function controls(local = false) {
    return `<div class="full-graph-controls" role="group" aria-label="${local ? 'Connected notes' : 'Complete graph'} controls"><button type="button" data-graph-zoom="out" aria-label="Zoom out">−</button><span ${local ? '' : 'id="full-graph-zoom-level"'} data-graph-level aria-live="polite">100%</span><button type="button" data-graph-zoom="in" aria-label="Zoom in">+</button><button type="button" data-graph-fit ${local ? '' : 'id="full-graph-reset"'} aria-label="Fit graph to view">Fit</button>${local ? '' : '<button type="button" data-graph-fullscreen>Fullscreen</button>'}</div>`;
  }

  function projectCount(notes, filters) {
    return notes.filter(note => note.type === 'project' && window.JamboreeProjects.matches(note, filters)).length;
  }

  function directory(notes) {
    return notes.map(note => `<a href="${href(note)}"><span>${escape(note.title)}</span><small>${escape(note.slug)}</small></a>`).join('');
  }

  function markup(notes) {
    const projects = window.JamboreeProjects;
    const filters = projects.getFilters();
    const visible = projects.graphNotes(notes, filters);
    const {nodes, edges} = model(visible);
    const count = projectCount(notes, filters);
    const empty = !nodes.length;
    return `<article class="complete-graph"><h1>Complete graph</h1><div class="graph-project-filters">${projects.controls(notes, filters)}</div><p class="graph-filter-summary" aria-live="polite">${count} ${projects.isActive(filters) ? 'matching ' : ''}project${count === 1 ? '' : 's'}</p><div class="full-graph-panel"><div class="full-graph-toolbar"><span class="full-graph-stats">${nodes.length} NOTES <span>/</span> ${edges.length} CONNECTIONS</span>${controls()}</div><div class="graph-filter-empty" role="status" ${empty ? '' : 'hidden'}><p>No projects match these filters.</p><button type="button" data-filter-reset>Reset filters</button></div><div class="full-graph-canvas" ${empty ? 'hidden' : ''} aria-label="Complete graph. Drag a node to move it; drag the background to pan; scroll or pinch to zoom. Plus and minus zoom; Home resets the view. Note links follow the graph."><canvas id="full-graph-canvas" class="vault-graph" tabindex="0" role="img" aria-label="${nodes.length} notes in the graph"></canvas></div></div><details class="full-graph-directory" ${empty ? 'hidden' : ''}><summary>All ${nodes.length} notes</summary><div class="graph-note-directory">${directory(nodes)}</div></details></article>`;
  }

  function mountGraph(canvas, frame, data, inset = false) {
    engineCleanup();
    engineCleanup = () => {};
    if (!data.nodes.length) {
      canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
      return;
    }
    // A closed rail has no viewport. Mount the unchanged vault effect when the
    // rail is revealed, so its initial positions use the real Canvas dimensions.
    if (!canvas.clientWidth || !canvas.clientHeight) {
      let waiting = true;
      const visible = new ResizeObserver(() => {
        if (!waiting || !canvas.clientWidth || !canvas.clientHeight) return;
        waiting = false;
        visible.disconnect();
        mountGraph(canvas,frame,data,inset);
      });
      visible.observe(canvas);
      engineCleanup = () => { waiting = false; visible.disconnect(); };
      return;
    }
    const names = data.nodes.map(node => node.slug);
    const bySlug = new Map(data.nodes.map(node => [node.slug,node]));
    const out = Object.fromEntries(names.map(slug => [slug,new Set()]));
    for (const {source,target} of data.edges) out[source.slug].add(target.slug);
    const grid = canvas.parentElement;
    const engine = window.JamboreeVaultGraph.create(canvas, {
      names, out, current: data.currentSlug, local: Boolean(data.currentSlug),
      disconnectedRepulsion: 1.35,
      onCameraChange: ({k,x,y}) => {
        grid.style.setProperty('--graph-dot-size',24*k+'px');
        grid.style.setProperty('--graph-cross-size',120*k+'px');
        grid.style.setProperty('--graph-dot-radius',.65*k+'px');
        grid.style.setProperty('--graph-dot-edge',.8*k+'px');
        grid.style.setProperty('--graph-offset-x',x+'px');
        grid.style.setProperty('--graph-offset-y',y+'px');
      },
      title: slug => bySlug.get(slug).title,
      onOpen: slug => { location.hash = '#/' + slug; },
      color: (slug, hover) => hover
        ? (document.body.classList.contains('dark') ? '#ffffff' : '#000000')
        : window.JamboreeGraphData.color(bySlug.get(slug),document.body.classList.contains('dark')),
    });
    // Expose read-only snapshots for the same source-vs-port browser diagnostics.
    canvas.graph = engine;
    const listeners = new AbortController();
    const on = (target,type,handler) => target?.addEventListener(type,handler,{signal:listeners.signal});
    const level = frame.querySelector('[data-graph-level]');
    const updateLevel = () => { if (level) level.textContent = Math.round(engine.snapshot().camera.k * 100) + '%'; };
    const zoom = factor => { engine.zoom(factor); updateLevel(); };
    const fit = () => {
      const {nodes} = engine.snapshot();
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const x = Math.max(1,...nodes.map(node => Math.abs(node.x-width/2)));
      const y = Math.max(1,...nodes.map(node => Math.abs(node.y-height/2)));
      engine.reset();
      engine.zoom(Math.min(1,(width-48)/(2*x),(height-48)/(2*y)));
      updateLevel();
    };
    on(frame.querySelector('[data-graph-zoom="in"]'),'click',()=>zoom(1.3));
    on(frame.querySelector('[data-graph-zoom="out"]'),'click',()=>zoom(1/1.3));
    on(frame.querySelector('[data-graph-fit]'),'click',fit);
    on(canvas,'wheel',updateLevel);
    on(canvas,'pointermove',updateLevel);
    on(canvas,'keydown',event => {
      if (['+','=','-','Home'].includes(event.key)) event.preventDefault();
      if (event.key==='+' || event.key==='=') zoom(1.3);
      if (event.key==='-') zoom(1/1.3);
      if (event.key==='Home') { engine.reset(); updateLevel(); }
    });
    const full = frame.querySelector('[data-graph-fullscreen]');
    if (full) {
      full.hidden = !frame.requestFullscreen || !document.fullscreenEnabled;
      on(full,'click',()=> {
        const operation = document.fullscreenElement===frame ? document.exitFullscreen() : frame.requestFullscreen();
        operation.catch(()=> { full.hidden = true; });
      });
      on(document,'fullscreenchange',()=> { full.textContent=document.fullscreenElement===frame ? 'Exit fullscreen' : 'Fullscreen'; });
    }
    const previous = frame.querySelector('.graph-accessible-links');
    previous?.remove();
    const links = document.createElement('nav');
    links.className = 'graph-accessible-links';
    links.setAttribute('aria-label',inset ? 'Graph notes' : 'Complete graph notes');
    links.innerHTML = data.nodes.map(note=>`<a href="${href(note)}">${escape(note.title)}</a>`).join('');
    frame.append(links);
    updateLevel();
    engineCleanup = () => {
      listeners.abort(); engine.destroy(); links.remove(); delete canvas.graph;
      if (document.fullscreenElement===frame) document.exitFullscreen().catch(()=>{});
    };
  }

  function mount(notes) {
    viewCleanup();
    const article = document.querySelector('.complete-graph');
    const canvas = article?.querySelector('#full-graph-canvas');
    if (!canvas) return;
    const projects = window.JamboreeProjects;
    const filterContainer = article.querySelector('.graph-project-filters');
    const frame = article.querySelector('.full-graph-panel');
    const listeners = new AbortController();
    projects.enhanceControls?.(filterContainer);

    function renderFilteredGraph(filters) {
      projects.enhanceControls?.(filterContainer);
      const visible = projects.graphNotes(notes, filters);
      const data = model(visible);
      const count = projectCount(notes, filters);
      const empty = !data.nodes.length;
      // Stop the old layout before hiding or replacing its nodes.
      engineCleanup();
      engineCleanup = () => {};
      article.querySelector('.graph-filter-summary').textContent = count + (projects.isActive(filters) ? ' matching ' : ' ') + 'project' + (count === 1 ? '' : 's');
      article.querySelector('.full-graph-stats').innerHTML = data.nodes.length + ' NOTES <span>/</span> ' + data.edges.length + ' CONNECTIONS';
      article.querySelector('.graph-filter-empty').hidden = !empty;
      article.querySelector('.full-graph-canvas').hidden = empty;
      const directoryElement = article.querySelector('.full-graph-directory');
      directoryElement.hidden = empty;
      directoryElement.querySelector('summary').textContent = 'All ' + data.nodes.length + ' notes';
      directoryElement.querySelector('.graph-note-directory').innerHTML = directory(data.nodes);
      canvas.setAttribute('aria-label', data.nodes.length + ' notes in the graph');
      frame.querySelectorAll('.full-graph-controls button').forEach(button => { button.disabled = empty; });
      frame.querySelector('[data-graph-level]').textContent = empty ? '—' : '100%';
      if (!empty) mountGraph(canvas, frame, data);
    }

    function applyFilters(filters) {
      projects.writeFilters(filters);
      renderFilteredGraph(filters);
    }
    filterContainer.addEventListener('change', event => {
      if (event.target.matches('select[data-filter]')) applyFilters(projects.readFilters(filterContainer));
    }, {signal: listeners.signal});
    article.addEventListener('click', event => {
      const reset = event.target.closest('[data-filter-reset]');
      if (!reset) return;
      event.preventDefault();
      filterContainer.querySelectorAll('select[data-filter]').forEach(select => { select.value = ''; });
      applyFilters({status: '', discipline: '', tag: ''});
    }, {signal: listeners.signal});
    window.addEventListener('popstate', () => {
      const filters = projects.getFilters();
      filterContainer.querySelectorAll('select[data-filter]').forEach(select => { select.value = filters[select.dataset.filter] || ''; });
      renderFilteredGraph(filters);
    }, {signal: listeners.signal});
    viewCleanup = () => listeners.abort();
    renderFilteredGraph(projects.getFilters());
  }

  function mountLocal(notes, slug) {
    viewCleanup();
    viewCleanup = () => {};
    const data = localModel(notes, slug);
    const complete = slug === 'index';
    const title = complete ? 'Complete graph' : 'Local graph';
    const heading = document.querySelector('#graph-heading');
    if (heading) heading.textContent = title;
    const canvas = document.querySelector('#graph');
    const frame = document.querySelector('.local-graph-panel');
    if (!canvas || !frame) return;
    canvas.setAttribute('aria-label', `${title}: ${data.nodes.length} notes`);
    const zoomHelp = complete ? 'Scroll or pinch to zoom.' : 'Pinch or use the zoom buttons to zoom.';
    frame.querySelector('.local-graph-canvas').setAttribute('aria-label', `${title}. Drag nodes to move them; drag the background to pan. ${zoomHelp} Plus and minus zoom; Home resets the view. Note links follow the graph.`);
    frame.querySelector('.local-graph-controls').innerHTML = controls(true);
    mountGraph(canvas, frame, data, true);
  }
  window.JamboreeGraph = {model, localModel, markup, mount, mountLocal, destroy: () => {
    engineCleanup(); viewCleanup();
    engineCleanup = () => {}; viewCleanup = () => {};
  }};
})();
