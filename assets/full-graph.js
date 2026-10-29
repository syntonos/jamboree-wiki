(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href = note => '#/' + (note.slug === 'index' ? '' : note.slug);
  let cleanup = () => {};

  function model(notes) {
    const nodes = notes.map(note => ({...note, children: [], vx: 0, vy: 0}));
    const bySlug = new Map(nodes.map(note => [note.slug, note]));
    const connections = new Map();
    function addEdge(from, to) {
      if (from === to || !bySlug.has(from) || !bySlug.has(to)) return;
      connections.set([from, to].sort().join('|'), {source: bySlug.get(from), target: bySlug.get(to)});
    }
    for (const note of nodes) {
      if (note.slug === 'index') continue;
      const parentPath = note.slug.split('/').slice(0, -1).join('/');
      const parent = note.slug.endsWith('/index') ? 'index' : bySlug.has(parentPath) ? parentPath : bySlug.has(parentPath + '/index') ? parentPath + '/index' : 'index';
      bySlug.get(parent)?.children.push(note);
      addEdge(parent, note.slug);
    }
    for (const note of nodes) {
      const references = [...(note.body || '').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
      references.push(...[...(note.body || '').matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(match => match[1]));
      for (let reference of references) {
        if (/^[a-z]+:/i.test(reference)) continue;
        const rooted = reference.startsWith('#/') || reference.startsWith('/');
        reference = reference.replace(/^#\//, '').split('#')[0].replace(/^\//, '').replace(/\.md$/, '');
        if (!reference) continue;
        let target = reference;
        if (!rooted && !bySlug.has(target) && !bySlug.has(target + '/index')) {
          const path = note.slug.split('/').slice(0, -1);
          for (const part of reference.split('/')) {
            if (part === '..') path.pop();
            else if (part !== '.') path.push(part);
          }
          target = path.join('/');
        }
        addEdge(note.slug, bySlug.has(target) ? target : target + '/index');
      }
    }
    const weight = note => note.children.length ? note.children.reduce((sum, child) => sum + weight(child), 0) : 1.4;
    function place(note, start, end, depth) {
      const angle = (start + end) / 2;
      const radius = depth === 0 ? 0 : depth === 1 ? 150 : depth === 2 ? 310 : 455;
      note.x = 700 + Math.cos(angle) * radius;
      note.y = 550 + Math.sin(angle) * radius;
      note.angle = angle;
      const total = note.children.reduce((sum, child) => sum + weight(child), 0);
      let cursor = start;
      for (const child of note.children) {
        const span = (end - start) * weight(child) / total;
        place(child, cursor, cursor + span, depth + 1);
        cursor += span;
      }
    }
    if (bySlug.has('index')) place(bySlug.get('index'), -Math.PI * .95, Math.PI * 1.05, 0);
    return {nodes, edges: [...connections.values()]};
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
    return `<div class="full-graph-controls" role="group" aria-label="${local ? 'Connected notes' : 'Complete graph'} controls"><button type="button" data-graph-zoom="out" aria-label="Zoom out">−</button><span ${local ? '' : 'id="full-graph-zoom-level"'} data-graph-level aria-live="polite">100%</span><button type="button" data-graph-zoom="in" aria-label="Zoom in">+</button><button type="button" data-graph-fit ${local ? '' : 'id="full-graph-reset"'} aria-label="Fit graph to view">Fit</button>${local ? '' : '<button type="button" data-graph-motion aria-pressed="false">Pause motion</button><button type="button" data-graph-fullscreen>Fullscreen</button>'}</div>`;
  }

  function markup(notes) {
    const {nodes, edges} = model(notes);
    return `<article class="complete-graph"><h1>Complete graph</h1><div class="full-graph-panel"><div class="full-graph-toolbar"><span class="full-graph-stats">${nodes.length} NOTES <span>/</span> ${edges.length} CONNECTIONS</span>${controls()}</div><div class="full-graph-canvas" tabindex="0" aria-label="Complete graph. Drag a node to move it; drag the background to pan; scroll or pinch to zoom. Arrow keys pan; plus and minus zoom; Home fits the graph."><svg id="full-graph-svg" viewBox="0 0 1400 1100" role="group" aria-label="All ${nodes.length} notes"></svg></div><div class="full-graph-caption"><span><i class="graph-key-hub"></i> Hub <i class="graph-key-note"></i> Note</span><span>Drag nodes · Scroll to zoom · Click to open</span></div></div><details class="full-graph-directory"><summary>All ${nodes.length} notes</summary><div class="graph-note-directory">${nodes.map(note => `<a href="${href(note)}"><span>${escape(note.title)}</span><small>${escape(note.slug)}</small></a>`).join('')}</div></details></article>`;
  }

  function mountGraph(svg, frame, data, local = false) {
    cleanup();
    if (!data.nodes.length) { svg.innerHTML = ''; return; }
    const width = local ? 700 : 1400, height = local ? 700 : 1100;
    const {nodes, edges} = data;
    const listeners = new AbortController();
    const on = (target, type, handler, options = {}) => target?.addEventListener(type, handler, {...options, signal: listeners.signal});
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reducedMotion.matches, alpha = .85, animation = 0, alive = true, interacted = false;
    let camera = {scale: 1, tx: 0, ty: 0}, fittedScale = 1;
    let drag = null, pinch = null, handledPointer = 0;
    const pointers = new Map();
    for (const node of nodes) { node.initialX = node.x; node.initialY = node.y; node.degree = 0; }
    for (const edge of edges) { edge.source.degree++; edge.target.degree++; }
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('interactive-graph-svg');
    svg.innerHTML = `<g class="graph-world" ${local ? '' : 'id="full-graph-world"'}><g class="graph-edges ${local ? 'local' : 'full'}-graph-edges">${edges.map(() => '<line/>').join('')}</g>${nodes.map(node => {
      const right = Math.cos(node.angle || 0) >= 0, x = right ? 21 : -21;
      const title = node.slug === 'index' ? 'Jamboree' : node.title;
      const hub = node.children.length > 0;
      return `<a href="${href(node)}" class="graph-node ${local ? 'local' : 'full'}-graph-node ${hub ? 'is-hub' : ''}" data-slug="${escape(node.slug)}" aria-label="Open ${escape(title)}"><title>${escape(title)}</title><g><circle class="node-hit" r="25"/><circle class="node-dot" r="${hub ? (local ? 17 : 13) : (local ? 12 : 9)}"/><text x="${x}" y="-3" text-anchor="${right ? 'start' : 'end'}">${labelLines(title, local ? 14 : 20).map((line, index) => `<tspan x="${x}" dy="${index ? (local ? 32 : 21) : 0}">${escape(line)}</tspan>`).join('')}</text></g></a>`;
    }).join('')}</g>`;
    const world = svg.querySelector('.graph-world');
    const anchors = [...svg.querySelectorAll('.graph-node')];
    const lineElements = [...svg.querySelectorAll('.graph-edges line')];
    const bySlug = new Map(nodes.map(node => [node.slug, node]));
    const labels = anchors.map((anchor, i) => ({node: nodes[i], anchor, text: anchor.querySelector('text'), position: null}));
    const labelOrder = [...labels].sort((a, b) => Number(b.node.children.length > 0) - Number(a.node.children.length > 0));
    function measureLabels() {
      for (const label of labels) {
        const box = label.text.getBBox();
        const fontSize = local ? 30 : 18;
        label.width = box.width || Math.max(...[...label.text.querySelectorAll('tspan')].map(line => line.textContent.length)) * fontSize * .6;
        label.height = box.height || label.text.querySelectorAll('tspan').length * (local ? 32 : 21);
        label.fontSize = fontSize;
      }
    }
    function placeLabels() {
      const occupied = [];
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      for (const label of labelOrder) {
        const {node} = label;
        const right = Math.cos(node.angle || 0) >= 0;
        const side = {x: right ? 24 : -24, anchor: right ? 'start' : 'end'};
        const opposite = {x: -side.x, anchor: right ? 'end' : 'start'};
        const candidates = [
          {...side, y: -3}, {...opposite, y: -3},
          {x: 0, y: -25 - label.height + label.fontSize, anchor: 'middle'},
          {x: 0, y: 27 + label.fontSize, anchor: 'middle'},
          {...side, y: -34}, {...side, y: 34}, {...opposite, y: -34}, {...opposite, y: 34}
        ];
        if (label.position) candidates.unshift(label.position);
        let best;
        for (const position of candidates) {
          const left = node.x + position.x - (position.anchor === 'end' ? label.width : position.anchor === 'middle' ? label.width / 2 : 0);
          const top = node.y + position.y - label.fontSize;
          const rect = {left: left - 4, right: left + label.width + 4, top: top - 3, bottom: top + label.height + 3};
          let score = occupied.reduce((total, other) => total + overlap(rect, other), 0);
          for (const other of nodes) if (other !== node) score += overlap(rect, {left: other.x - 17, right: other.x + 17, top: other.y - 17, bottom: other.y + 17}) * 3;
          if (!best || score < best.score) best = {position, rect, score};
          if (!score) break;
        }
        label.position = best.position;
        const hide = best.score > 0 && !node.children.length;
        label.anchor.classList.toggle('label-collides', hide);
        label.text.setAttribute('text-anchor', best.position.anchor);
        label.text.setAttribute('x', best.position.x);
        label.text.setAttribute('y', best.position.y);
        label.text.querySelectorAll('tspan').forEach(line => line.setAttribute('x', best.position.x));
        if (!hide) occupied.push(best.rect);
      }
    }
    measureLabels();
    const level = frame.querySelector('[data-graph-level]');
    const motion = frame.querySelector('[data-graph-motion]');
    const full = frame.querySelector('[data-graph-fullscreen]');

    function paint() {
      nodes.forEach((node, i) => anchors[i].querySelector('g').setAttribute('transform', `translate(${node.x} ${node.y})`));
      placeLabels();
      edges.forEach((edge, i) => {
        const line = lineElements[i];
        line.setAttribute('x1', edge.source.x); line.setAttribute('y1', edge.source.y);
        line.setAttribute('x2', edge.target.x); line.setAttribute('y2', edge.target.y);
      });
    }
    function updateCamera() {
      world.setAttribute('transform', `translate(${camera.tx} ${camera.ty}) scale(${camera.scale})`);
      if (level) level.textContent = Math.round(camera.scale / fittedScale * 100) + '%';
      const ratio = camera.scale / fittedScale;
      frame.querySelector('[data-graph-zoom="in"]').disabled = ratio >= 6 - .001;
      frame.querySelector('[data-graph-zoom="out"]').disabled = ratio <= .25 + .001;
    }
    function fit() {
      if (!svg.getBoundingClientRect().width) return;
      const bounds = world.getBBox();
      const margin = local ? 42 : 65;
      fittedScale = Math.min((width - margin * 2) / Math.max(1, bounds.width), (height - margin * 2) / Math.max(1, bounds.height), 2);
      camera = {scale: fittedScale, tx: width / 2 - (bounds.x + bounds.width / 2) * fittedScale, ty: height / 2 - (bounds.y + bounds.height / 2) * fittedScale};
      updateCamera();
    }
    const screenPoint = event => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const worldPoint = point => ({x: (point.x - camera.tx) / camera.scale, y: (point.y - camera.ty) / camera.scale});
    function zoom(multiplier, point = {x: width / 2, y: height / 2}) {
      const fixed = worldPoint(point);
      camera.scale = Math.max(fittedScale * .25, Math.min(fittedScale * 6, camera.scale * multiplier));
      camera.tx = point.x - fixed.x * camera.scale;
      camera.ty = point.y - fixed.y * camera.scale;
      interacted = true;
      updateCamera();
    }
    function simulate() {
      animation = 0;
      if (!alive || paused || document.hidden || !svg.getBoundingClientRect().width) return;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x || .1, dy = b.y - a.y || .1;
          const distance = Math.max(8, Math.hypot(dx, dy));
          const repulsion = (local ? 2400 : 7000) * alpha / (distance * distance);
          const collision = Math.max(0, (local ? 105 : 115) - distance) * .04 * alpha;
          const force = repulsion + collision;
          a.vx -= dx / distance * force; a.vy -= dy / distance * force;
          b.vx += dx / distance * force; b.vy += dy / distance * force;
        }
      }
      for (const {source, target} of edges) {
        const dx = target.x - source.x, dy = target.y - source.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = (distance - (local ? 155 : 180)) * .022 * alpha;
        source.vx += dx / distance * force / Math.sqrt(source.degree || 1);
        source.vy += dy / distance * force / Math.sqrt(source.degree || 1);
        target.vx -= dx / distance * force / Math.sqrt(target.degree || 1);
        target.vy -= dy / distance * force / Math.sqrt(target.degree || 1);
      }
      for (const node of nodes) {
        node.vx = (node.vx + (node.initialX - node.x) * .001 * alpha) * .8;
        node.vy = (node.vy + (node.initialY - node.y) * .001 * alpha) * .8;
        node.x = node.fx ?? Math.max(60, Math.min(width - 60, node.x + Math.max(-12, Math.min(12, node.vx))));
        node.y = node.fy ?? Math.max(60, Math.min(height - 60, node.y + Math.max(-12, Math.min(12, node.vy))));
      }
      paint();
      alpha *= .975;
      if (drag?.node) alpha = Math.max(alpha, .25);
      if (alpha > .008) animation = requestAnimationFrame(simulate);
      else if (!interacted) fit();
    }
    function reheat() { alpha = Math.max(alpha, .6); if (!animation && !paused && !document.hidden) animation = requestAnimationFrame(simulate); }
    function updateMotion() {
      if (motion) { motion.textContent = paused ? 'Resume motion' : 'Pause motion'; motion.setAttribute('aria-pressed', String(paused)); }
      if (paused) { cancelAnimationFrame(animation); animation = 0; }
      else reheat();
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
    on(motion, 'click', () => { paused = !paused; updateMotion(); });
    on(reducedMotion, 'change', event => { paused = event.matches; updateMotion(); });
    on(document, 'visibilitychange', () => { if (!document.hidden) reheat(); });
    on(svg, 'wheel', event => {
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
      zoom(Math.exp(-Math.max(-500, Math.min(500, pixels)) * .002), screenPoint(event));
    }, {passive: false});
    on(svg, 'pointerover', event => { if (!drag) highlight(event.target.closest('.graph-node')?.dataset.slug); });
    on(svg, 'pointerleave', () => { if (!drag) highlight(null); });
    on(svg, 'focusin', event => highlight(event.target.closest('.graph-node')?.dataset.slug));
    on(svg, 'focusout', () => highlight(null));

    function releaseNode() { if (drag?.node) { drag.node.fx = null; drag.node.fy = null; } }
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
      if (node) { node.fx = node.x; node.fy = node.y; anchor.focus({preventScroll: true}); }
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
        camera.scale = Math.max(fittedScale * .25, Math.min(fittedScale * 6, camera.scale * distance / pinch.distance));
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
      if (alive && svg.getBoundingClientRect().width) { if (!interacted) fit(); reheat(); }
    });
    sizeObserver.observe(svg);
    paint(); fit(); updateMotion();
    document.fonts?.ready.then(() => { if (alive) { measureLabels(); paint(); if (!interacted) fit(); } });
    cleanup = () => {
      alive = false; listeners.abort(); sizeObserver.disconnect(); cancelAnimationFrame(animation); releaseNode();
      if (document.fullscreenElement === frame) document.exitFullscreen().catch(() => {});
    };
  }

  function mount(notes) {
    const svg = document.querySelector('#full-graph-svg');
    if (svg) mountGraph(svg, document.querySelector('.full-graph-panel'), model(notes));
  }
  function mountLocal(notes, slug) {
    const complete = model(notes), bySlug = new Map(complete.nodes.map(node => [node.slug, node]));
    const center = bySlug.get(slug) || bySlug.get('index');
    if (!center) return;
    const included = new Set([center.slug]);
    const neighbors = slug => complete.edges.map(edge => edge.source.slug === slug ? edge.target : edge.target.slug === slug ? edge.source : null).filter(Boolean);
    for (const node of neighbors(center.slug)) { if (included.size < 8) included.add(node.slug); }
    if (included.size < 3) {
      for (const node of neighbors(center.slug)) for (const sibling of neighbors(node.slug)) {
        if (included.size < 8) included.add(sibling.slug);
      }
    }
    const nodes = [center, ...complete.nodes.filter(node => node !== center && included.has(node.slug))];
    nodes.forEach((node, i) => {
      node.angle = i === 0 ? 0 : (i - 1) / (nodes.length - 1) * Math.PI * 2;
      node.x = 350 + (i === 0 ? 0 : Math.cos(node.angle) * 175);
      node.y = 350 + (i === 0 ? 0 : Math.sin(node.angle) * 175);
    });
    const frame = document.querySelector('.local-graph-panel');
    frame.querySelector('.local-graph-controls').innerHTML = controls(true);
    mountGraph(document.querySelector('#graph'), frame, {nodes, edges: complete.edges.filter(edge => included.has(edge.source.slug) && included.has(edge.target.slug))}, true);
  }
  window.JamboreeGraph = {markup, mount, mountLocal, destroy: () => cleanup()};
})();
