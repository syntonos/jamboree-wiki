(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JamboreeContent = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  function maskCode(source) {
    let fence = null;
    const lines = String(source || '').split('\n');
    const masked = lines.map(line => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
        return ' '.repeat(line.length);
      }
      if (marker) { fence = { character: marker[1][0], length: marker[1].length }; return ' '.repeat(line.length); }
      return line.replace(/(`+)(.*?)\1/g, match => ' '.repeat(match.length));
    }).join('\n');
    return masked.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' '));
  }

  function headingId(text) {
    const plain = String(text || '')
      .replace(/!?(?:\[([^\]]*)\])\([^)]*\)/g, '$1')
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[`*_~]/g, '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');
    return plain || 'section';
  }

  function headings(body) {
    const masked = maskCode(body).split('\n');
    const original = String(body || '').replace(/\r\n/g, '\n').split('\n');
    const used = new Set(), counts = new Map(), result = [];
    masked.forEach((line, index) => {
      if (!/^ {0,3}#{1,6}\s/.test(line)) return;
      const match = original[index].match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (!match) return;
      const base = headingId(match[2]);
      let count = counts.get(base) || 0;
      let id = base + (count ? '-' + count : '');
      while (used.has(id)) id = base + '-' + (++count);
      counts.set(base, count + 1); used.add(id);
      result.push({ id, text: match[2], level: match[1].length, line: index + 1 });
    });
    return result;
  }

  function escaped(source, index) {
    let count = 0;
    for (let i = index - 1; i >= 0 && source[i] === '\\'; i--) count++;
    return count % 2 === 1;
  }

  function extractLinks(body) {
    const original = String(body || ''), source = maskCode(original), result = [];
    let line = 1;
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') { line++; continue; }
      if (source[i] !== '[' || escaped(source, i)) continue;
      if (source[i + 1] === '[') {
        const end = source.indexOf(']]', i + 2);
        if (end < 0) continue;
        const content = source.slice(i + 2, end);
        if (content.includes('\n')) continue;
        const separator = content.indexOf('|');
        const target = (separator < 0 ? content : content.slice(0, separator)).trim();
        if (target) result.push({ target, label: separator < 0 ? target : original.slice(i + 2 + separator + 1, end), line, image: false, syntax: 'wiki', start: i, end: end + 2 });
        i = end + 1;
        continue;
      }
      let depth = 1, close = i + 1;
      for (; close < source.length && source[close] !== '\n'; close++) {
        if (escaped(source, close)) continue;
        if (source[close] === '[') depth++;
        if (source[close] === ']' && --depth === 0) break;
      }
      if (depth || source[close + 1] !== '(') continue;
      let cursor = close + 2;
      while (/\s/.test(source[cursor] || '') && source[cursor] !== '\n') cursor++;
      let target = '', end = cursor;
      if (source[cursor] === '<') {
        end = source.indexOf('>', cursor + 1);
        if (end < 0) continue;
        target = source.slice(cursor + 1, end++);
      } else {
        let parens = 0;
        for (; end < source.length; end++) {
          const character = source[end];
          if (character === '\\' && end + 1 < source.length) { target += source[++end]; continue; }
          if (character === '(') parens++;
          if (character === ')') { if (!parens) break; parens--; }
          if (/\s/.test(character) && !parens) break;
          target += character;
        }
      }
      let finish = end;
      while (source[finish] === ' ' || source[finish] === '\t') finish++;
      if (source[finish] === '"' || source[finish] === "'") {
        const quote = source[finish++];
        while (finish < source.length && (source[finish] !== quote || escaped(source, finish))) finish++;
        finish++;
        while (source[finish] === ' ' || source[finish] === '\t') finish++;
      }
      if (source[finish] !== ')') continue;
      const image = source[i - 1] === '!' && !escaped(source, i - 1);
      result.push({ target: target.trim(), label: original.slice(i + 1, close), line, image, syntax: 'markdown', start: image ? i - 1 : i, end: finish + 1 });
      i = finish;
    }
    return result;
  }

  function normalizePath(value) {
    const result = [];
    for (const segment of value.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') { if (!result.length) return null; result.pop(); }
      else result.push(segment);
    }
    return result.join('/');
  }

  function noteHref(slug, anchor) {
    return '#/' + (slug === 'index' ? '' : String(slug).split('/').map(encodeURIComponent).join('/')) + (anchor ? '#' + encodeURIComponent(anchor) : '');
  }

  function resolveLink(target, sourceSlug, notes) {
    let raw = String(target || '').trim();
    if (!raw) return { kind: 'invalid', reason: 'empty link target' };
    if (/^(?:https?:|mailto:|tel:)/i.test(raw) || raw.startsWith('//')) return { kind: 'external', href: raw };
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return { kind: 'invalid', reason: 'unsupported or unsafe URL scheme' };
    if (raw.includes('\\') || raw.includes('\0')) return { kind: 'invalid', reason: 'invalid path characters' };
    const slugs = new Set((notes || []).map(note => typeof note === 'string' ? note : note.slug));
    const explicitRoute = raw.startsWith('#/');
    if (explicitRoute) raw = raw.slice(2);
    const hash = raw.indexOf('#');
    let anchor = hash < 0 ? '' : raw.slice(hash + 1);
    let pathname = hash < 0 ? raw : raw.slice(0, hash);
    const question = pathname.indexOf('?');
    const query = question < 0 ? '' : pathname.slice(question);
    if (question >= 0) pathname = pathname.slice(0, question);
    try { pathname = decodeURIComponent(pathname); anchor = decodeURIComponent(anchor); }
    catch { return { kind: 'invalid', reason: 'malformed URL encoding' }; }
    if (pathname.includes('\\') || pathname.includes('\0') || anchor.includes('\0')) return { kind: 'invalid', reason: 'invalid path characters' };
    if (!explicitRoute && !pathname && raw.startsWith('#')) {
      return { kind: 'anchor', slug: sourceSlug, anchor, href: noteHref(sourceSlug, anchor) };
    }
    const rooted = explicitRoute || pathname.startsWith('/');
    pathname = pathname.replace(/^\/+/, '');
    if (explicitRoute && !pathname) pathname = 'index';
    const withoutMd = pathname.replace(/\.md$/i, '');
    const noteCandidate = candidate => slugs.has(candidate) ? candidate : slugs.has(candidate + '/index') ? candidate + '/index' : null;
    let slug = rooted ? noteCandidate(withoutMd) : null;
    const base = 'content/' + String(sourceSlug || 'index').split('/').slice(0, -1).join('/');
    const relative = normalizePath(base + '/' + pathname);
    if (!rooted && relative?.startsWith('content/')) slug = noteCandidate(relative.slice(8).replace(/\.md$/i, ''));
    if (!slug) slug = noteCandidate(withoutMd);
    if (slug) return { kind: 'note', slug, anchor, href: noteHref(slug, anchor) };
    if (rooted && ['graph', 'main-site'].includes(withoutMd)) {
      if (anchor) return { kind: 'invalid', reason: 'virtual pages do not define note headings' };
      return { kind: 'note', slug: withoutMd, virtual: true, anchor: '', href: '#/' + withoutMd };
    }
    // Explicit /assets paths are assets even when a downloadable file ends in .md.
    let assetPath;
    if (rooted || pathname.startsWith('assets/')) assetPath = normalizePath(pathname);
    else if (relative && !relative.startsWith('content/')) assetPath = relative;
    else if (relative) assetPath = relative;
    const extension = pathname.match(/\.([^./]+)$/)?.[1].toLowerCase();
    const downloadableFile = extension && extension !== 'md';
    if (assetPath && (!assetPath.startsWith('content/') || downloadableFile) && !explicitRoute) {
      return { kind: 'asset', path: assetPath, anchor, href: assetPath.split('/').map(encodeURIComponent).join('/') + query + (anchor ? '#' + encodeURIComponent(anchor) : '') };
    }
    const expected = rooted ? withoutMd : relative?.startsWith('content/') ? relative.slice(8).replace(/\.md$/i, '') : withoutMd;
    return { kind: 'invalid', reason: relative === null && !rooted ? 'path escapes the site root' : 'note does not exist: ' + expected };
  }

  return { resolveLink, extractLinks, headingId, headings, headingIds: body => headings(body).map(heading => heading.id), noteHref };
});
