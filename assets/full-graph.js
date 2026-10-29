(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href = note => '#/' + (note.slug === 'index' ? '' : note.slug);
  let cleanup = () => {};
  function model(notes) {
    const nodes = notes.map(note => ({...note, children: []}));
    const bySlug = new Map(nodes.map(note => [note.slug, note]));
    const edges = new Map();
    const addEdge = (from, to) => {
      if (from === to || !bySlug.has(from) || !bySlug.has(to)) return;
      const key = [from, to].sort().join('|');
      edges.set(key, {source: bySlug.get(from), target: bySlug.get(to)});
    };
    for (const note of nodes) {
      if (note.slug === 'index') continue;
      const segments = note.slug.split('/');
      segments.pop();
      const parentPath = segments.join('/');
      const parent = note.slug.endsWith('/index') ? 'index' : bySlug.has(parentPath) ? parentPath : bySlug.has(parentPath + '/index') ? parentPath + '/index' : 'index';
      note.parent = parent;
      bySlug.get(parent)?.children.push(note);
      addEdge(parent, note.slug);
    }
    for (const note of nodes) {
      const references = [...note.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
      references.push(...[...note.body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(match => match[1]));
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
    const root = bySlug.get('index');
    const weight = note => note.children.length ? note.children.reduce((sum, child) => sum + weight(child), 0) : 1.4;
    function place(note, start, end, depth) {
      const angle = (start + end) / 2;
      const radius = depth === 0 ? 0 : depth === 1 ? 150 : depth === 2 ? 290 : 430;
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
    if (root) place(root, -Math.PI * .95, Math.PI * 1.05, 0);
    return {nodes, edges: [...edges.values()]};
  }
  function labelLines(title) {
    const words = title.split(' '), lines = [''];
    for (const word of words) {
      const last = lines.length - 1;
      if (lines[last] && (lines[last] + ' ' + word).length > 19) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
    return lines;
  }
  function markup(notes) {
    const {nodes, edges} = model(notes);
    const lineMarkup = edges.map(edge => `<line x1="${edge.source.x}" y1="${edge.source.y}" x2="${edge.target.x}" y2="${edge.target.y}"/>`).join('');
    const nodeMarkup = nodes.map(note => {
      const right = Math.cos(note.angle) >= 0;
      const hub = note.children.length > 0;
      const x = right ? 17 : -17;
      const title = note.slug === 'index' ? 'Jamboree' : note.title;
      return `<a href="${href(note)}" class="full-graph-node ${hub ? 'is-hub' : ''}" data-slug="${escape(note.slug)}" aria-label="Open ${escape(title)}"><title>${escape(title)}</title><g transform="translate(${note.x} ${note.y})"><circle r="${note.slug === 'index' ? 12 : hub ? 9 : 7}"/><text x="${x}" y="-3" text-anchor="${right ? 'start' : 'end'}">${labelLines(title).map((line, index) => `<tspan x="${x}" dy="${index ? 16 : 0}">${escape(line)}</tspan>`).join('')}</text></g></a>`;
    }).join('');
    return `<article class="complete-graph"><div class="eyebrow">FIELDBOOK / COMPLETE GRAPH</div><h1>Ideas, connected.</h1><p class="description">The whole fieldbook on one drawing. Follow a connection or open any note.</p><div class="full-graph-toolbar"><span class="full-graph-stats">${nodes.length} NOTES <span>/</span> ${edges.length} CONNECTIONS</span><div class="full-graph-controls" role="group" aria-label="Graph view controls"><button type="button" data-graph-zoom="out" aria-label="Zoom out">−</button><span id="full-graph-zoom-level" aria-live="polite">100%</span><button type="button" data-graph-zoom="in" aria-label="Zoom in">+</button><button type="button" id="full-graph-reset">Reset</button></div></div><div class="full-graph-canvas" tabindex="0" aria-label="Complete graph. Drag to pan, use plus and minus to zoom, arrow keys to pan, and Home to reset."><svg id="full-graph-svg" viewBox="0 0 1400 1100" role="group" aria-label="All ${nodes.length} notes in the Jamboree fieldbook"><g id="full-graph-world"><g class="full-graph-edges">${lineMarkup}</g>${nodeMarkup}</g></svg></div><div class="full-graph-caption"><span><i class="graph-key-hub"></i> Hub <i class="graph-key-note"></i> Note</span><span>DRAG TO PAN / SELECT A NOTE TO OPEN</span></div><details class="full-graph-directory"><summary>Browse all ${nodes.length} notes</summary><div class="graph-note-directory">${nodes.map(note => `<a href="${href(note)}"><span>${escape(note.title)}</span><small>${escape(note.slug)}</small></a>`).join('')}</div></details></article>`;
  }
  function mount() {
    cleanup();
    const svg = document.querySelector('#full-graph-svg');
    if (!svg) return;
    const world = document.querySelector('#full-graph-world');
    const canvas = document.querySelector('.full-graph-canvas');
    const controller = new AbortController();
    const on = (target, type, handler) => target.addEventListener(type, handler, {signal: controller.signal});
    let scale = 1, dx = 0, dy = 0, drag = null;
    function update() {
      world.setAttribute('transform', `translate(${700 + dx} ${550 + dy}) scale(${scale}) translate(-700 -550)`);
      document.querySelector('#full-graph-zoom-level').textContent = Math.round(scale * 100) + '%';
      document.querySelector('[data-graph-zoom="in"]').disabled = scale >= 3;
      document.querySelector('[data-graph-zoom="out"]').disabled = scale <= .6;
    }
    function zoom(multiplier) { scale = Math.max(.6, Math.min(3, scale * multiplier)); update(); }
    function reset() { scale = 1; dx = dy = 0; update(); }
    on(document.querySelector('[data-graph-zoom="in"]'), 'click', () => zoom(1.25));
    on(document.querySelector('[data-graph-zoom="out"]'), 'click', () => zoom(.8));
    on(document.querySelector('#full-graph-reset'), 'click', reset);
    const point = event => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    on(svg, 'pointerdown', event => {
      if (event.button !== 0 || event.target.closest('a')) return;
      const start = point(event);
      drag = {x: start.x, y: start.y, dx, dy};
      svg.setPointerCapture(event.pointerId);
      canvas.classList.add('is-panning');
    });
    on(svg, 'pointermove', event => {
      if (!drag) return;
      const position = point(event);
      dx = drag.dx + position.x - drag.x;
      dy = drag.dy + position.y - drag.y;
      update();
    });
    const stop = () => { drag = null; canvas.classList.remove('is-panning'); };
    on(svg, 'pointerup', stop); on(svg, 'pointercancel', stop); on(svg, 'lostpointercapture', stop);
    on(canvas, 'keydown', event => {
      if (event.target !== canvas) return;
      const actions = {'+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(.8), Home: reset, ArrowLeft: () => { dx += 60; update(); }, ArrowRight: () => { dx -= 60; update(); }, ArrowUp: () => { dy += 60; update(); }, ArrowDown: () => { dy -= 60; update(); }};
      if (actions[event.key]) {event.preventDefault(); actions[event.key]();}
    });
    cleanup = () => controller.abort();
    update();
  }
  window.JamboreeGraph = {markup, mount, destroy: () => cleanup()};
})();
