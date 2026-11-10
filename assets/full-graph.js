(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href = note => '#/' + (note.slug === 'index' ? '' : note.slug);
  let engineCleanup = () => {};
  let viewCleanup = () => {};

  function model(notes) {
    const nodes = notes.filter(note => !['index', 'about'].includes(note.slug)).map((note, index) => {
      const folder = note.slug.includes('/') ? note.slug.split('/')[0] : '';
      let hue = 0, seed = 7;
      for (const letter of folder) hue = (hue * 31 + letter.charCodeAt(0)) % 360;
      for (const letter of note.slug) seed = (seed * 31 + letter.charCodeAt(0)) >>> 0;
      return {...note, children: [], hue: folder ? hue : 250, x: Math.cos(index) * 60 + seed % 20, y: Math.sin(index) * 60 + (seed >>> 8) % 20, vx: 0, vy: 0};
    });
    const bySlug = new Map(nodes.map(note => [note.slug, note]));
    const connections = new Map();
    function addEdge(from, to) {
      if (from === to || !bySlug.has(from) || !bySlug.has(to)) return;
      connections.set([from, to].sort().join('|'), {source: bySlug.get(from), target: bySlug.get(to)});
    }
    for (const note of nodes) {
      const parentPath = note.slug.split('/').slice(0, -1).join('/');
      const parent = note.slug.endsWith('/index') ? null : bySlug.has(parentPath) ? parentPath : parentPath + '/index';
      bySlug.get(parent)?.children.push(note);
      addEdge(parent, note.slug);
      for (const target of note.links || []) addEdge(note.slug, target);
    }
    return {nodes, edges: [...connections.values()]};
  }

  function localModel(notes, slug) {
    const complete = model(notes);
    if (slug === 'index') return complete;
    const connected = new Set([slug]);
    for (const edge of complete.edges) {
      if (edge.source.slug === slug) connected.add(edge.target.slug);
      if (edge.target.slug === slug) connected.add(edge.source.slug);
    }
    return {
      nodes: complete.nodes.filter(node => connected.has(node.slug)),
      edges: complete.edges.filter(edge => connected.has(edge.source.slug) && connected.has(edge.target.slug)),
      currentSlug: slug,
    };
  }

  // The reference graph's repulsion, centering, springs, and damping. Positions
  // use CSS pixels so the same forces work in both the inset and full window.
  function step(nodes, edges, width, height, alpha) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y;
        const squared = dx * dx + dy * dy + .1, distance = Math.sqrt(squared);
        const force = 2600 / squared * alpha;
        a.vx += dx / distance * force; a.vy += dy / distance * force;
        b.vx -= dx / distance * force; b.vy -= dy / distance * force;
      }
      a.vx += (width / 2 - a.x) * .004 * alpha;
      a.vy += (height / 2 - a.y) * .004 * alpha;
    }
    for (const {source: a, target: b} of edges) {
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1;
      const force = (distance - 90) * .02 * alpha;
      a.vx += dx / distance * force; a.vy += dy / distance * force;
      b.vx -= dx / distance * force; b.vy -= dy / distance * force;
    }
    for (const node of nodes) {
      if (node.fx != null) { node.x = node.fx; node.y = node.fy; node.vx = node.vy = 0; continue; }
      node.vx *= .8; node.vy *= .8;
      node.x += node.vx; node.y += node.vy;
    }
  }

  function labelLines(title, limit = 20) {
    const lines = [''];
    for (const word of title.split(' ')) {
      const last = lines.length - 1;
      if (lines[last] && (lines[last] + ' ' + word).length > limit) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
    return lines;
  }

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
    return `<article class="complete-graph"><h1>Complete graph</h1><div class="graph-project-filters">${projects.controls(notes, filters)}</div><p class="graph-filter-summary" aria-live="polite">${count} ${projects.isActive(filters) ? 'matching ' : ''}project${count === 1 ? '' : 's'}</p><div class="full-graph-panel"><div class="full-graph-toolbar"><span class="full-graph-stats">${nodes.length} NOTES <span>/</span> ${edges.length} CONNECTIONS</span>${controls()}</div><div class="graph-filter-empty" role="status" ${empty ? '' : 'hidden'}><p>No projects match these filters.</p><button type="button" data-filter-reset>Reset filters</button></div><div class="full-graph-canvas" tabindex="0" ${empty ? 'hidden' : ''} aria-label="Complete graph. Drag a node to move it; drag the background to pan; scroll or pinch to zoom. Arrow keys pan; plus and minus zoom; Home fits the graph."><svg id="full-graph-svg" viewBox="0 0 1400 1100" role="group" aria-label="${nodes.length} notes in the graph"></svg></div></div><details class="full-graph-directory" ${empty ? 'hidden' : ''}><summary>All ${nodes.length} notes</summary><div class="graph-note-directory">${directory(nodes)}</div></details></article>`;
  }

  function mountGraph(svg, frame, data, local = false) {
    engineCleanup();
    engineCleanup = () => {};
    if (!data.nodes.length) { svg.innerHTML = ''; return; }
    let width = svg.clientWidth || (local ? 280 : 900), height = svg.clientHeight || (local ? 360 : 720);
    const {nodes, edges} = data;
    const listeners = new AbortController();
    const on = (target, type, handler, options = {}) => target?.addEventListener(type, handler, {...options, signal: listeners.signal});
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reducedMotion.matches, alpha = 1, animation = 0, alive = true, interacted = false;
    let previousFrame = 0, frameCount = 0;
    let camera = {scale: 1, tx: 0, ty: 0}, fittedScale = 1;
    let drag = null, pinch = null, handledPointer = 0;
    const pointers = new Map();
    for (const node of nodes) {
      node.x += width / 2; node.y += height / 2; node.degree = 0;
    }
    for (const edge of edges) { edge.source.degree++; edge.target.degree++; }
    // Resolve the most crowded initial positions before showing the first frame.
    // Reduced-motion users get the settled layout with no running animation.
    const initialSteps = paused ? 600 : 35;
    for (let i = 0; i < initialSteps; i++) step(nodes, edges, width, height, Math.pow(.994, i));
    if (paused) alpha = .03;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.remove('has-highlight', 'is-dragging');
    svg.classList.add('interactive-graph-svg');
    svg.innerHTML = `<g class="graph-world" ${local ? '' : 'id="full-graph-world"'}><g class="graph-edges ${local ? 'local' : 'full'}-graph-edges">${edges.map(() => '<line vector-effect="non-scaling-stroke"/>').join('')}</g>${nodes.map(node => {
      const title = node.title;
      const radius = 4 + Math.min(node.degree, 8) * 1.2;
      return `<a href="${href(node)}" class="graph-node ${local ? 'local' : 'full'}-graph-node ${node.children.length ? 'is-hub' : ''} ${node.slug === data.currentSlug ? 'is-current' : ''}" data-slug="${escape(node.slug)}" style="--node-hue:${node.hue}" aria-label="Open ${escape(title)}"><title>${escape(title)}</title><g><circle class="node-hit" r="18"/><circle class="node-dot" r="${radius}"/><text x="0" y="${radius + 13}" text-anchor="middle">${labelLines(title.toUpperCase(), local ? 22 : 30).map((line, index) => `<tspan x="0" dy="${index ? 14 : 0}">${escape(line)}</tspan>`).join('')}</text></g></a>`;
    }).join('')}</g>`;
    const world = svg.querySelector('.graph-world');
    const anchors = [...svg.querySelectorAll('.graph-node')];
    const lineElements = [...svg.querySelectorAll('.graph-edges line')];
    const bySlug = new Map(nodes.map(node => [node.slug, node]));
    const level = frame.querySelector('[data-graph-level]');
    const full = frame.querySelector('[data-graph-fullscreen]');

    function paint() {
      nodes.forEach((node, i) => {
        const group = anchors[i].querySelector('g');
        group.setAttribute('transform', `translate(${node.x} ${node.y})`);
        const label = group.querySelector('text');
        label.style.fontSize = 11 / camera.scale + 'px';
        label.setAttribute('y', 4 + Math.min(node.degree, 8) * 1.2 + 13 / camera.scale);
        label.querySelectorAll('tspan').forEach((line, lineIndex) => line.setAttribute('dy', lineIndex ? 14 / camera.scale : 0));
        group.querySelector('.node-hit').setAttribute('r', 14 / camera.scale + 4);
      });
      edges.forEach((edge, i) => {
        const line = lineElements[i];
        line.setAttribute('x1', edge.source.x); line.setAttribute('y1', edge.source.y);
        line.setAttribute('x2', edge.target.x); line.setAttribute('y2', edge.target.y);
      });
    }
    function updateCamera() {
      const transform = `translate(${camera.tx} ${camera.ty}) scale(${camera.scale})`;
      world.setAttribute('transform', transform);
      if (level) level.textContent = Math.round(camera.scale / fittedScale * 100) + '%';
      paint();
      const ratio = camera.scale / fittedScale;
      frame.querySelector('[data-graph-zoom="in"]').disabled = ratio >= 4 - .001;
      frame.querySelector('[data-graph-zoom="out"]').disabled = ratio <= .25 + .001;
    }
    function fit() {
      if (!svg.getBoundingClientRect().width) return;
      const xs = nodes.map(node => node.x), ys = nodes.map(node => node.y);
      const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
      const marginX = local ? Math.min(72, width * .22) : 90, marginY = 48;
      fittedScale = Math.min((width - marginX * 2) / Math.max(1, right - left), (height - marginY * 2) / Math.max(1, bottom - top), 1);
      camera = {scale: fittedScale, tx: width / 2 - (left + right) / 2 * fittedScale, ty: height / 2 - (top + bottom) / 2 * fittedScale};
      updateCamera();
    }
    const screenPoint = event => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const worldPoint = point => ({x: (point.x - camera.tx) / camera.scale, y: (point.y - camera.ty) / camera.scale});
    function zoom(multiplier, point = {x: width / 2, y: height / 2}) {
      const fixed = worldPoint(point);
      camera.scale = Math.max(fittedScale * .25, Math.min(fittedScale * 4, camera.scale * multiplier));
      camera.tx = point.x - fixed.x * camera.scale;
      camera.ty = point.y - fixed.y * camera.scale;
      interacted = true;
      updateCamera();
    }
    function simulate(timestamp) {
      animation = 0;
      if (!alive || paused || document.hidden || !svg.getBoundingClientRect().width) { previousFrame = 0; return; }
      // Use a fixed 60 Hz step so high-refresh displays do not speed up physics.
      const elapsed = previousFrame ? Math.min(timestamp - previousFrame, 50) : 1000 / 60;
      const count = Math.max(1, Math.round(elapsed / (1000 / 60)));
      if (previousFrame && timestamp - previousFrame < 1000 / 75) { animation = requestAnimationFrame(simulate); return; }
      previousFrame = timestamp;
      for (let iteration = 0; iteration < count && alpha > .03; iteration++) {
        step(nodes, edges, width, height, alpha);
        if (!drag?.node) alpha *= .994;
      }
      paint();
      if (!interacted && ++frameCount % 12 === 0) fit();
      if (alpha > .03 || drag?.node) animation = requestAnimationFrame(simulate);
      else if (!interacted) fit();
    }
    function reheat() {
      alpha = 1; previousFrame = 0;
      if (!animation && !paused && !document.hidden) animation = requestAnimationFrame(simulate);
    }
    function updateMotion() {
      cancelAnimationFrame(animation); animation = 0; previousFrame = 0;
      if (paused) {
        for (let i = 0; i < 600; i++) step(nodes, edges, width, height, Math.pow(.994, i));
        alpha = .03; paint(); if (!interacted) fit();
      } else if (!document.hidden && alpha > .03) animation = requestAnimationFrame(simulate);
    }
    function highlight(slug) {
      const connected = new Set([slug]);
      edges.forEach(edge => { if (edge.source.slug === slug) connected.add(edge.target.slug); if (edge.target.slug === slug) connected.add(edge.source.slug); });
      svg.classList.toggle('has-highlight', Boolean(slug));
      anchors.forEach(anchor => anchor.classList.toggle('is-neighbor', connected.has(anchor.dataset.slug)));
      edges.forEach((edge, i) => lineElements[i].classList.toggle('is-connected', edge.source.slug === slug || edge.target.slug === slug));
    }
    on(frame.querySelector('[data-graph-zoom="in"]'), 'click', () => zoom(1.25));
    on(frame.querySelector('[data-graph-zoom="out"]'), 'click', () => zoom(.8));
    on(frame.querySelector('[data-graph-fit]'), 'click', () => { interacted = true; fit(); });
    on(reducedMotion, 'change', event => { paused = event.matches; updateMotion(); });
    on(document, 'visibilitychange', () => {
      cancelAnimationFrame(animation); animation = 0; previousFrame = 0;
      if (!document.hidden && !paused && alpha > .03) animation = requestAnimationFrame(simulate);
    });
    on(svg, 'wheel', event => {
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
      zoom(Math.exp(-Math.max(-500, Math.min(500, pixels)) * .0015), screenPoint(event));
    }, {passive: false});
    on(svg, 'pointerover', event => { if (!drag) highlight(event.target.closest('.graph-node')?.dataset.slug); });
    on(svg, 'pointerleave', () => { if (!drag) highlight(null); });
    on(svg, 'focusin', event => highlight(event.target.closest('.graph-node')?.dataset.slug));
    on(svg, 'focusout', () => highlight(null));

    function releaseNode() {
      if (drag?.node) { drag.node.fx = null; drag.node.fy = null; }
    }
    on(svg, 'pointerdown', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const point = screenPoint(event);
      pointers.set(event.pointerId, point);
      svg.setPointerCapture(event.pointerId);
      if (pointers.size === 2) {
        releaseNode(); drag = null;
        const [a, b] = [...pointers.values()];
        pinch = {distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), midpoint: {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}};
        return;
      }
      const anchor = event.target.closest('.graph-node');
      const node = anchor ? bySlug.get(anchor.dataset.slug) : null;
      const grab = worldPoint(point);
      drag = {id: event.pointerId, node, anchor, offsetX: node ? node.x - grab.x : 0, offsetY: node ? node.y - grab.y : 0, x: point.x, y: point.y, clientX: event.clientX, clientY: event.clientY, tx: camera.tx, ty: camera.ty, moved: false};
      if (node) { node.fx = node.x; node.fy = node.y; anchor.focus({preventScroll: true}); reheat(); }
    });
    on(svg, 'pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      const point = screenPoint(event);
      pointers.set(event.pointerId, point);
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const midpoint = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        const fixed = worldPoint(pinch.midpoint);
        camera.scale = Math.max(fittedScale * .25, Math.min(fittedScale * 4, camera.scale * distance / pinch.distance));
        camera.tx = midpoint.x - fixed.x * camera.scale; camera.ty = midpoint.y - fixed.y * camera.scale;
        pinch = {distance, midpoint}; interacted = true; updateCamera();
        return;
      }
      if (!drag || drag.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - drag.clientX, event.clientY - drag.clientY) > 4) drag.moved = true;
      if (!drag.moved) return;
      interacted = true; svg.classList.add('is-dragging');
      if (drag.node) {
        const pointInWorld = worldPoint(point);
        drag.node.x = drag.node.fx = pointInWorld.x + drag.offsetX; drag.node.y = drag.node.fy = pointInWorld.y + drag.offsetY;
        drag.node.vx = drag.node.vy = 0; paint(); reheat();
      } else {
        camera.tx = drag.tx + point.x - drag.x; camera.ty = drag.ty + point.y - drag.y; updateCamera();
      }
    });
    function stopPointer(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      handledPointer = performance.now();
      const open = event.type === 'pointerup' && !pinch && drag?.node && !drag.moved ? drag.anchor.getAttribute('href') : null;
      releaseNode(); drag = null;
      if (pointers.size) {
        const [id, point] = [...pointers.entries()][0];
        drag = {id, node: null, x: point.x, y: point.y, tx: camera.tx, ty: camera.ty, moved: true, clientX: -Infinity, clientY: -Infinity};
      } else { pinch = null; svg.classList.remove('is-dragging'); }
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (open) location.hash = open;
    }
    on(svg, 'pointerup', stopPointer); on(svg, 'pointercancel', stopPointer); on(svg, 'lostpointercapture', stopPointer);
    on(svg, 'click', event => {
      if (event.detail > 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && performance.now() - handledPointer < 500) event.preventDefault();
    });
    const canvas = svg.parentElement;
    on(canvas, 'keydown', event => {
      if (event.target !== canvas) return;
      const actions = {'+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(.8), Home: fit, ArrowLeft: () => { camera.tx += 60; updateCamera(); }, ArrowRight: () => { camera.tx -= 60; updateCamera(); }, ArrowUp: () => { camera.ty += 60; updateCamera(); }, ArrowDown: () => { camera.ty -= 60; updateCamera(); }};
      if (actions[event.key]) { event.preventDefault(); interacted = true; actions[event.key](); }
    });
    if (full) {
      full.hidden = !frame.requestFullscreen || !document.fullscreenEnabled;
      on(full, 'click', () => {
        const operation = document.fullscreenElement === frame ? document.exitFullscreen() : frame.requestFullscreen();
        operation.catch(() => { full.hidden = true; });
      });
      on(document, 'fullscreenchange', () => { full.textContent = document.fullscreenElement === frame ? 'Exit fullscreen' : 'Fullscreen'; });
    }
    const sizeObserver = new ResizeObserver(() => {
      const nextWidth = svg.clientWidth, nextHeight = svg.clientHeight;
      if (!alive || !nextWidth || !nextHeight || nextWidth === width && nextHeight === height) return;
      const dx = (nextWidth - width) / 2, dy = (nextHeight - height) / 2;
      for (const node of nodes) { node.x += dx; node.y += dy; }
      width = nextWidth; height = nextHeight;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      if (!interacted) fit(); else updateCamera();
      reheat();
    });
    sizeObserver.observe(svg);
    paint(); fit(); updateMotion();
    document.fonts?.ready.then(() => { if (alive) { paint(); if (!interacted) fit(); } });
    engineCleanup = () => {
      alive = false; listeners.abort(); sizeObserver.disconnect(); cancelAnimationFrame(animation); releaseNode();
      if (document.fullscreenElement === frame) document.exitFullscreen().catch(() => {});
    };
  }

  function mount(notes) {
    viewCleanup();
    const article = document.querySelector('.complete-graph');
    const svg = article?.querySelector('#full-graph-svg');
    if (!svg) return;
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
      svg.innerHTML = '';
      article.querySelector('.graph-filter-summary').textContent = count + (projects.isActive(filters) ? ' matching ' : ' ') + 'project' + (count === 1 ? '' : 's');
      article.querySelector('.full-graph-stats').innerHTML = data.nodes.length + ' NOTES <span>/</span> ' + data.edges.length + ' CONNECTIONS';
      article.querySelector('.graph-filter-empty').hidden = !empty;
      article.querySelector('.full-graph-canvas').hidden = empty;
      const directoryElement = article.querySelector('.full-graph-directory');
      directoryElement.hidden = empty;
      directoryElement.querySelector('summary').textContent = 'All ' + data.nodes.length + ' notes';
      directoryElement.querySelector('.graph-note-directory').innerHTML = directory(data.nodes);
      svg.setAttribute('aria-label', data.nodes.length + ' notes in the graph');
      frame.querySelectorAll('.full-graph-controls button').forEach(button => { button.disabled = empty; });
      frame.querySelector('[data-graph-level]').textContent = empty ? '—' : '100%';
      if (!empty) mountGraph(svg, frame, data);
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
    const svg = document.querySelector('#graph');
    const frame = document.querySelector('.local-graph-panel');
    if (!svg || !frame) return;
    svg.setAttribute('aria-label', `${title}: ${data.nodes.length} notes`);
    frame.querySelector('.local-graph-canvas').setAttribute('aria-label', `${title}. Drag nodes to move them; drag the background to pan; scroll or pinch to zoom. Arrow keys pan; plus and minus zoom; Home fits the graph.`);
    frame.querySelector('.local-graph-controls').innerHTML = controls(true);
    mountGraph(svg, frame, data, true);
  }
  window.JamboreeGraph = {model, localModel, markup, mount, mountLocal, destroy: () => {
    engineCleanup(); viewCleanup();
    engineCleanup = () => {}; viewCleanup = () => {};
  }};
})();
