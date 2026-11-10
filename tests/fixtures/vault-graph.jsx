import { useEffect, useRef } from 'react'
import { names, out, backlinks, title, tagsOf } from '../lib/vault.js'

// Colour nodes by top-level folder
const hue = (p) => {
  const f = p.includes('/') ? p.split('/')[0] : ''
  if (!f) return '#cfc9ff'
  let h = 0
  for (const c of f) h = (h * 31 + c.charCodeAt(0)) % 360
  return `hsl(${h} 85% 72%)`
}

// Force graph on a canvas with zoom (wheel / pinch / buttons) and pan (drag background).
// `local` = current note + neighbours only. `tag` = only notes with that tag.
export default function Graph({ current, onOpen, local = false, tag = null }) {
  const ref = useRef(), api = useRef({})
  const cur = useRef(current); cur.current = current
  const open = useRef(onOpen); open.current = onOpen

  useEffect(() => {
    const cv = ref.current, cx = cv.getContext('2d')
    let W = 0, H = 0, raf, drag = null, hover = null, moved = false, alpha = 1, pan = null, pinch = null
    const T = { k: 1, x: 0, y: 0 }, P = new Map()
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

    const toW = (x, y) => [(x - T.x) / T.k, (y - T.y) / T.k]
    const zoomAt = (x, y, f) => { const k = Math.min(4, Math.max(0.25, T.k * f)); const [wx, wy] = toW(x, y); T.k = k; T.x = x - wx * k; T.y = y - wy * k }
    api.current = { zoom: (f) => zoomAt(W / 2, H / 2, f), reset: () => { T.k = 1; T.x = 0; T.y = 0 } }

    const loop = () => {
      if (alpha > 0.03) {
        for (const a of N) {
          for (const b of N) { if (a === b) continue; const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.1, d = Math.sqrt(d2), f = 2600 / d2 * alpha; a.vx += dx / d * f; a.vy += dy / d * f }
          a.vx += (W / 2 - a.x) * 0.004 * alpha; a.vy += (H / 2 - a.y) * 0.004 * alpha
        }
        for (const [a, b] of E) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 90) * 0.02 * alpha; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f }
        for (const n of N) { if (n === drag) continue; n.vx *= 0.8; n.vy *= 0.8; n.x += n.vx; n.y += n.vy }
        if (!drag) alpha *= 0.994
      }
      const d = devicePixelRatio || 1
      cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, W, H)
      if (!N.length) { cx.fillStyle = '#9a90c4'; cx.font = '12px "JetBrains Mono", monospace'; cx.textAlign = 'center'; cx.fillText('NO NOTES', W / 2, H / 2) }
      cx.setTransform(d * T.k, 0, 0, d * T.k, d * T.x, d * T.y)
      cx.lineWidth = 1 / T.k; cx.strokeStyle = 'rgba(130,120,255,.4)'; cx.beginPath()
      for (const [a, b] of E) { cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y) }
      cx.stroke()
      cx.font = `${11 / T.k}px "JetBrains Mono", monospace`; cx.textAlign = 'center'
      for (const n of N) {
        const r = 4 + Math.min(n.deg, 8) * 1.2
        const col = n.p === cur.current ? '#4de1ff' : n === hover ? '#fff' : hue(n.p)
        cx.beginPath(); cx.arc(n.x, n.y, r, 0, 7)
        cx.shadowBlur = 12; cx.shadowColor = col; cx.fillStyle = col; cx.fill(); cx.shadowBlur = 0
        cx.fillStyle = '#fff'; cx.fillText(title(n.p).toUpperCase(), n.x, n.y + r + 13 / T.k)
      }
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
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('wheel', wheel) }
  }, [local && current, local, tag])

  return (
    <div className="gwrap">
      <canvas ref={ref} className="graph" />
      {!local && (
        <div className="gctl">
          <button onClick={() => api.current.zoom?.(1.3)} aria-label="Zoom in">+</button>
          <button onClick={() => api.current.zoom?.(1 / 1.3)} aria-label="Zoom out">−</button>
          <button onClick={() => api.current.reset?.()} aria-label="Reset view">⟲</button>
        </div>
      )}
    </div>
  )
}
