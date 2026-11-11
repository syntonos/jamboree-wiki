/* Direct Canvas port of vault/src/components/Graph.jsx from the supplied vault.zip.
 * Reference SHA-256: 99fd51cfc74fc97d8ead9afc99b36a0033b4464319a307eed93eef6d250d068a.
 * React's effect/ref boundary is replaced with create/destroy. The default
 * physics match the reference; callers can increase repulsion between separate
 * components. Drawing colors use the wiki theme and central-node gradient.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JamboreeVaultGraph = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  function create(canvas, options) {
    const {names, out, title, current, onOpen, color, local = false, tag = null, tagsOf = {}, disconnectedRepulsion = 1, onCameraChange, adaptiveLabels = false} = options;
    const backlinks = p => names.filter(n => out[n].has(p));
    const ref = {current:canvas}, api = {current:{}}, cur = {current}, open = {current:onOpen};
    const cv = ref.current, cx = cv.getContext('2d')
    let W = 0, H = 0, raf, drag = null, hover = null, moved = false, alpha = 1, pan = null, pinch = null
    const T = { k: 1, x: 0, y: 0 }, P = new Map()
    let paintedCamera = ''
    let labels = []
    const labelPositions = new Map()
    const size = () => { const d = devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; alpha = 1 }
    size()
    const ro = new ResizeObserver(size); ro.observe(cv)

    let ids = names
    if (local) { const s = new Set([cur.current, ...out[cur.current], ...backlinks(cur.current)]); ids = names.filter((n) => s.has(n)) }
    else if (tag) ids = names.filter((n) => tagsOf[n].has(tag))
    const N = ids.map((p, i) => ({ p, x: W / 2 + Math.cos(i) * 60 + Math.random() * 20, y: H / 2 + Math.sin(i) * 60 + Math.random() * 20, vx: 0, vy: 0, deg: 0 }))
    const ix = Object.fromEntries(N.map((n) => [n.p, n]))
    const E = []
    ids.forEach((a) => out[a].forEach((b) => { if (ix[b]) { E.push([ix[a], ix[b]]); ix[a].deg++; ix[b].deg++ } }))

    // Treat indirect links as connected too. Only separate components receive
    // the optional extra push; springs and forces within a component stay intact.
    const adjacent = new Map(N.map(n => [n, []])), component = new Map()
    for (const [a, b] of E) { adjacent.get(a).push(b); adjacent.get(b).push(a) }
    for (const root of N) {
      if (component.has(root)) continue
      const queue = [root]; component.set(root, root)
      for (let i = 0; i < queue.length; i++) for (const next of adjacent.get(queue[i])) {
        if (component.has(next)) continue
        component.set(next, root); queue.push(next)
      }
    }

    const toW = (x, y) => [(x - T.x) / T.k, (y - T.y) / T.k]
    const zoomAt = (x, y, f) => { const k = Math.min(4, Math.max(0.25, T.k * f)); const [wx, wy] = toW(x, y); T.k = k; T.x = x - wx * k; T.y = y - wy * k }
    api.current = { zoom: (f) => zoomAt(W / 2, H / 2, f), reset: () => { T.k = 1; T.x = 0; T.y = 0 } }

    // Labels are laid out in CSS pixels, independently of the vault simulation.
    // Keep a readable minimum and show fewer labels when the nodes are crowded.
    const drawLabels = (d, style) => {
      const fontSize = T.k < 1 ? 8.5 + 2.5 * (T.k - 0.25) / 0.75 : Math.min(15, 11 * Math.sqrt(T.k))
      const dots = N.map(n => ({n, x:n.x*T.k+T.x, y:n.y*T.k+T.y, r:(4+Math.min(n.deg,8)*1.2)*T.k}))
        .filter(dot => dot.x+dot.r >= 0 && dot.x-dot.r <= W && dot.y+dot.r >= 0 && dot.y-dot.r <= H)
      const priority = n => n === hover ? 2 : n.p === cur.current ? 1 : 0
      const ordered = [...dots].sort((a,b) => priority(b.n)-priority(a.n) || b.n.deg-a.n.deg || a.n.p.localeCompare(b.n.p))
      const overlaps = (a,b) => a.x < b.x+b.width+3 && a.x+a.width+3 > b.x && a.y < b.y+b.height+3 && a.y+a.height+3 > b.y
      const coversDot = (box,dot) => Math.hypot(dot.x-Math.max(box.x,Math.min(dot.x,box.x+box.width)),dot.y-Math.max(box.y,Math.min(dot.y,box.y+box.height))) < dot.r+2
      const maxWidth = Math.max(1,Math.min(180,W-12))
      const placed = []
      cx.setTransform(d,0,0,d,0,0); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = style.color
      for (const dot of ordered) {
        const {n,x,y,r} = dot
        const size = n === hover ? Math.max(11,fontSize) : fontSize
        cx.font = `${size}px "JetBrains Mono", monospace`
        const text = title(n.p).toUpperCase(), words = text.split(/\s+/), lines = []
        let line = ''
        for (const word of words) {
          if (line && cx.measureText(line+' '+word).width <= maxWidth) { line += ' '+word; continue }
          if (line) { lines.push(line); line = '' }
          for (const letter of word) {
            if (cx.measureText(line+letter).width > maxWidth && line) { lines.push(line); line = '' }
            line += letter
          }
        }
        if (line) lines.push(line)
        const width = Math.max(...lines.map(line => cx.measureText(line).width)), lineHeight = size*1.25, height = lines.length*lineHeight
        const candidates = [
          {side:'below',x:x-width/2,y:y+r+5},
          {side:'above',x:x-width/2,y:y-r-5-height},
          {side:'right',x:x+r+5,y:y-height/2},
          {side:'left',x:x-r-5-width,y:y-height/2},
        ].map(box => ({...box,x:Math.max(4,Math.min(W-width-4,box.x)),y:Math.max(4,Math.min(H-height-4,box.y)),width,height}))
        const previous = labelPositions.get(n.p)
        candidates.sort((a,b) => Number(b.side===previous)-Number(a.side===previous))
        const clearLabels = box => !placed.some(other => overlaps(box,other))
        const box = candidates.find(box => clearLabels(box) && !dots.some(other => coversDot(box,other)))
          || (priority(n) && candidates.find(clearLabels))
        if (!box) continue
        labelPositions.set(n.p,box.side)
        placed.push({slug:n.p,text,lines,fontSize:size,x:box.x,y:box.y,width,height})
      }
      labels = placed
      // Hover takes priority in layout and is painted last for clear inspection.
      for (const label of [...placed].reverse()) {
        cx.font = `${label.fontSize}px "JetBrains Mono", monospace`
        label.lines.forEach((line,i) => cx.fillText(line,label.x+label.width/2,label.y+label.fontSize*1.25*(i+0.5)))
      }
      cx.textBaseline = 'alphabetic'
    }

    const loop = () => {
      if (alpha > 0.03) {
        for (const a of N) {
          for (const b of N) { if (a === b) continue; const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.1, d = Math.sqrt(d2), strength = component.get(a) === component.get(b) ? 1 : disconnectedRepulsion, f = 2600 / d2 * alpha * strength; a.vx += dx / d * f; a.vy += dy / d * f }
          a.vx += (W / 2 - a.x) * 0.004 * alpha; a.vy += (H / 2 - a.y) * 0.004 * alpha
        }
        for (const [a, b] of E) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 90) * 0.02 * alpha; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f }
        for (const n of N) { if (n === drag) continue; n.vx *= 0.8; n.vy *= 0.8; n.x += n.vx; n.y += n.vy }
        if (!drag) alpha *= 0.994
      }
      const d = devicePixelRatio || 1, style = getComputedStyle(cv)
      const cameraKey = `${T.k}:${T.x}:${T.y}`
      if (onCameraChange && cameraKey !== paintedCamera) {
        paintedCamera = cameraKey; onCameraChange({...T})
      }
      cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, W, H)
      if (!N.length) { cx.fillStyle = '#9a90c4'; cx.font = '12px "JetBrains Mono", monospace'; cx.textAlign = 'center'; cx.fillText('NO NOTES', W / 2, H / 2) }
      cx.setTransform(d * T.k, 0, 0, d * T.k, d * T.x, d * T.y)
      cx.lineWidth = 1 / T.k; cx.strokeStyle = style.getPropertyValue('--line').trim() || 'rgba(130,120,255,.4)'; cx.beginPath()
      for (const [a, b] of E) { cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y) }
      cx.stroke()
      cx.font = `${11 / T.k}px "JetBrains Mono", monospace`; cx.textAlign = 'center'
      for (const n of N) {
        const r = 4 + Math.min(n.deg, 8) * 1.2
        const col = color(n.p, n === hover, n.p === cur.current)
        cx.beginPath(); cx.arc(n.x, n.y, r, 0, 7)
        cx.shadowBlur = 12; cx.shadowColor = col; cx.fillStyle = col; cx.fill(); cx.shadowBlur = 0
        if (!adaptiveLabels) { cx.fillStyle = style.color; cx.fillText(title(n.p).toUpperCase(), n.x, n.y + r + 13 / T.k) }
      }
      if (adaptiveLabels) drawLabels(d,style)
      raf = requestAnimationFrame(loop)
    }
    loop()

    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const hit = (wx, wy) => N.find((n) => Math.hypot(n.x - wx, n.y - wy) < 14 / T.k + 4)
    const two = () => { const [a, b] = [...P.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] } }
    cv.onpointerdown = (e) => {
      const p = pt(e); P.set(e.pointerId, p); cv.setPointerCapture(e.pointerId)
      if (P.size === 2) { drag = null; pan = null; pinch = { d: two().d, k: T.k }; return }
      drag = hit(...toW(...p)) || null; moved = false
      if (drag) alpha = 1; else pan = { x: p[0], y: p[1], tx: T.x, ty: T.y }
    }
    cv.onpointermove = (e) => {
      const p = pt(e)
      if (P.has(e.pointerId)) P.set(e.pointerId, p)
      if (P.size === 2 && pinch) { const t = two(); zoomAt(t.m[0], t.m[1], (pinch.k * t.d / pinch.d) / T.k); return }
      if (drag) { const [wx, wy] = toW(...p); drag.x = wx; drag.y = wy; moved = true }
      else if (pan) { T.x = pan.tx + p[0] - pan.x; T.y = pan.ty + p[1] - pan.y }
      else { hover = hit(...toW(...p)) || null; cv.style.cursor = hover ? 'pointer' : 'grab' }
    }
    cv.onpointerup = cv.onpointercancel = (e) => {
      if (drag && !moved && P.size <= 1) open.current(drag.p)
      P.delete(e.pointerId); if (P.size < 2) pinch = null
      drag = null; pan = null
    }
    const wheel = (e) => { e.preventDefault(); const [x, y] = pt(e); zoomAt(x, y, Math.exp(-e.deltaY * 0.0015)) }
    if (!local) cv.addEventListener('wheel', wheel, { passive: false })
    const destroy = () => {
      cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('wheel', wheel)
      cv.onpointerdown = cv.onpointermove = cv.onpointerup = cv.onpointercancel = null
    }
    return {
      zoom: (factor) => api.current.zoom(factor),
      reset: () => api.current.reset(),
      destroy,
      snapshot: () => ({
        nodes: N.map(n => ({slug:n.p,x:n.x,y:n.y,vx:n.vx,vy:n.vy,degree:n.deg})),
        edges: E.map(([a,b]) => [a.p,b.p]), camera:{...T}, alpha,
        labels: labels.map(label => ({...label,lines:[...label.lines]})),
      }),
    }
  }
  return {create};
});
