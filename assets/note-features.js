(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./content-utils.js'), require('./projects.js'));
  else root.JamboreeNotes = factory(root.JamboreeContent, root.JamboreeProjects);
})(typeof window === 'undefined' ? globalThis : window, function (content, projects) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const noteHref = slug => '#/' + (slug === 'index' ? '' : slug);
  function renderLink(label, target, slug, notes, image = false) {
    const link = content.resolveLink(target.trim().replace(/^<|>$/g, ''), slug, notes);
    if (!link || link.kind === 'invalid') return `<span class="invalid-link">${escape(label)}</span>`;
    if (image) {
      if (!['asset','external'].includes(link.kind) || !/^(?:assets\/|https?:\/\/|\/\/)/i.test(link.href || '')) return escape(label);
      return `<img class="note-image" src="${escape(link.href)}" alt="${escape(label)}" loading="lazy">`;
    }
    const download = link.kind === 'asset';
    const external = link.kind === 'external' && /^(?:https?:|\/\/)/i.test(link.href);
    return `<a href="${escape(link.href)}"${download ? ' class="resource-download" download' : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(label)}${download ? '<span class="download-mark" aria-hidden="true"> ↓</span>' : ''}</a>`;
  }
  function inline(text, slug, notes) {
    const tokens = content.extractLinks(text).map(reference => ({...reference,kind:'link'}));
    for (const match of text.matchAll(/`([^`]+)`/g)) tokens.push({kind:'code',start:match.index,end:match.index+match[0].length,value:match[1]});
    for (const match of text.matchAll(/\*\*([^*]+)\*\*|\*([^*\n]+)\*/g)) tokens.push({kind:match[1] === undefined ? 'em' : 'strong',start:match.index,end:match.index+match[0].length,value:match[1] || match[2]});
    tokens.sort((a,b) => a.start-b.start || b.end-a.end);
    let html='', cursor=0;
    for (const token of tokens) {
      if (token.start<cursor) continue;
      html+=escape(text.slice(cursor,token.start));
      if (token.kind==='link') {
        let label=token.label;
        if (token.syntax==='wiki' && !text.slice(token.start,token.end).includes('|')) {
          const resolved=content.resolveLink(token.target,slug,notes);
          label=notes.find(note=>note.slug===resolved.slug)?.title || token.target;
        }
        html+=renderLink(label,token.target,slug,notes,token.image);
      } else html+='<'+token.kind+'>'+escape(token.value)+'</'+token.kind+'>';
      cursor=token.end;
    }
    return html+escape(text.slice(cursor)).replace(/\\\|/g,'|');
  }
  function cells(line) {
    let source = line.trim().replace(/^\|/, '');
    let backslashes = 0;
    for (let i = source.length - 2; i >= 0 && source[i] === '\\'; i--) backslashes++;
    if (source.endsWith('|') && backslashes % 2 === 0) source = source.slice(0,-1);
    const links = content.extractLinks(source);
    const inLink = index => links.some(link => index >= link.start && index < link.end);
    const result = []; let cell = '', code = false;
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\\' && source[i+1] === '|') { cell += '|'; i++; }
      else if (inLink(i)) cell += source[i];
      else if (source[i] === '`') { code = !code; cell += source[i]; }
      else if (source[i] === '|' && !code) { result.push(cell.trim()); cell = ''; }
      else cell += source[i];
    }
    result.push(cell.trim());
    return result;
  }
  const tableDivider = line => line.includes('|') && cells(line).every(cell => /^:?-{3,}:?$/.test(cell));
  function markdown(body, slug, notes) {
    const lines = body.replace(/\r\n/g,'\n').split('\n');
    const headings = new Map(content.headings(body).map(heading => [heading.line, heading]));
    let html = '', i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
      if (fence) {
        const code = []; i++;
        while (i < lines.length && !new RegExp('^\\s*' + fence[1][0] + '{' + fence[1].length + ',}\\s*$').test(lines[i])) code.push(lines[i++]);
        i++; html += `<pre><code>${escape(code.join('\n'))}</code></pre>`; continue;
      }
      if (i+1 < lines.length && line.includes('|') && tableDivider(lines[i+1])) {
        const header = cells(line), alignment = cells(lines[i+1]);
        const align = index => alignment[index]?.endsWith(':') ? alignment[index]?.startsWith(':') ? 'center' : 'right' : 'left';
        html += '<div class="markdown-table"><table><thead><tr>' + header.map((cell,index) => `<th scope="col" style="text-align:${align(index)}">${inline(cell,slug,notes)}</th>`).join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
          const row = cells(lines[i++]);
          html += '<tr>' + header.map((_, index) => `<td style="text-align:${align(index)}">${inline(row[index] || '',slug,notes)}</td>`).join('') + '</tr>';
        }
        html += '</tbody></table></div>'; continue;
      }
      const heading = headings.get(i+1);
      if (heading) { html += `<h${heading.level} id="note-${escape(heading.id)}" data-heading-id="${escape(heading.id)}">${inline(heading.text,slug,notes)}</h${heading.level}>`; i++; continue; }
      if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) { html += '<hr>'; i++; continue; }
      const item = line.match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
      if (item) {
        const ordered = /\d/.test(item[1]), tag = ordered ? 'ol' : 'ul';
        html += `<${tag}>`;
        while (i < lines.length) {
          const next = lines[i].match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
          if (!next || /\d/.test(next[1]) !== ordered) break;
          const task = next[2].match(/^\[([ xX])\]\s+(.*)$/);
          html += '<li>' + (task ? `<input type="checkbox" disabled ${task[1].toLowerCase() === 'x' ? 'checked' : ''}> ${inline(task[2],slug,notes)}` : inline(next[2],slug,notes)) + '</li>';
          i++;
        }
        html += `</${tag}>`; continue;
      }
      if (/^\s*>/.test(line)) { html += `<blockquote>${inline(line.replace(/^\s*>\s?/,''),slug,notes)}</blockquote>`; i++; continue; }
      const paragraph = [line]; i++;
      while (i < lines.length && lines[i].trim() && !/^\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s|>|`{3,}|~{3,})/.test(lines[i]) && !(i+1 < lines.length && tableDivider(lines[i+1]))) paragraph.push(lines[i++]);
      html += `<p>${inline(paragraph.join(' '),slug,notes)}</p>`;
    }
    return html;
  }
  function tags(note, linked = false) {
    return `<div class="note-tags">${projects.split(note.tags).map(tag => linked ? `<a class="tag" href="${escape(projects.filterHref({tag}))}">${escape(tag)}</a>` : `<span class="tag">${escape(tag)}</span>`).join('')}</div>`;
  }
  function facts(note) {
    const lead = note.lead || 'Unassigned', contact = note.contact || '';
    const contactTarget = contact.includes('@') && !/^[a-z]+:/i.test(contact) ? 'mailto:' + contact : contact;
    const contactLink = contact ? renderLink(contact,contactTarget,note.slug,[]) : 'Not set';
    return `<section class="project-facts" aria-label="Project details"><dl><div><dt>Lead</dt><dd>${escape(lead)}</dd></div><div><dt>Contact</dt><dd>${contactLink}</dd></div><div><dt>Updated</dt><dd>${note.updated ? `<time datetime="${escape(note.updated)}">${escape(note.updated)}</time>` : 'Not set'}</dd></div><div><dt>Discipline</dt><dd>${escape(note.discipline || 'Not set')}</dd></div></dl><div class="project-progress"><div><h2>Next milestone</h2><p>${escape(note.next_milestone || 'Not set')}</p></div><div><h2>Help needed</h2><p>${escape(note.help_needed || 'Not specified')}</p></div></div>${tags(note,true)}</section>`;
  }
  function backlinks(note, notes) {
    const sources = (note.backlinks || []).map(slug => notes.find(source => source.slug === slug)).filter(Boolean);
    return `<section class="article-backlinks" id="linked-from"><h2>Linked from <span>${sources.length}</span></h2>${sources.length ? `<div class="backlink-list">${sources.map(source => `<a href="${noteHref(source.slug)}"><span>${escape(source.title)}</span><small>${escape(source.type === 'project' ? 'Project' : source.slug.startsWith('guides/') ? 'Guide' : 'Note')}</small></a>`).join('')}</div>` : '<p>No incoming note links.</p>'}</section>`;
  }
  return {markdown, inline, tags, facts, backlinks};
});
