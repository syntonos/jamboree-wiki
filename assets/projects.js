(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JamboreeProjects = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const split = value => [...new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean))];
  const equal = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const isActive = filters => ['status', 'discipline', 'tag'].some(key => String(filters[key] || '').trim());
  function matches(note, filters = {}) {
    return note.type === 'project'
      && (!filters.status || equal(note.status, filters.status))
      && (!filters.discipline || split(note.discipline).some(value => equal(value, filters.discipline)))
      && (!filters.tag || split(note.tags).some(value => equal(value, filters.tag)));
  }
  function getFilters() {
    const query = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
    return Object.fromEntries(['status', 'discipline', 'tag'].map(key => [key, (query.get(key) || '').trim()]));
  }
  function writeFilters(filters) {
    const url = new URL(location.href);
    for (const key of ['status', 'discipline', 'tag']) {
      if (filters[key]) url.searchParams.set(key, filters[key]);
      else url.searchParams.delete(key);
    }
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  function filterHref(filters, route = 'projects/index') {
    const query = new URLSearchParams();
    for (const key of ['status', 'discipline', 'tag']) if (filters[key]) query.set(key, filters[key]);
    return '?' + query.toString() + '#/' + route;
  }
  function controls(notes, filters = {}) {
    const projects = notes.filter(note => note.type === 'project');
    const statuses = [...new Set(['current', 'past', 'future', ...projects.map(note => note.status).filter(Boolean)])];
    const disciplines = [...new Set(projects.flatMap(note => split(note.discipline)))].sort();
    const tags = [...new Set(projects.flatMap(note => split(note.tags)))].sort();
    const select = (key, title, values, all) => {
      const value = filters[key] || '';
      const choices = [...values];
      if (value && !choices.includes(value)) choices.push(value);
      return `<label>${title}<select data-filter="${key}"><option value="">${all}</option>${choices.map(option => `<option value="${escape(option)}" ${option === value ? 'selected' : ''}>${escape(key === 'status' ? option[0].toUpperCase() + option.slice(1) : option)}</option>`).join('')}</select></label>`;
    };
    return `<div class="project-filters" role="search" aria-label="Filter projects">${select('status','Status',statuses,'All statuses')}${select('discipline','Discipline',disciplines,'All disciplines')}${select('tag','Tag',tags,'All tags')}<button type="button" data-filter-reset>Reset filters</button></div>`;
  }
  function readFilters(container) {
    return Object.fromEntries(['status','discipline','tag'].map(key => [key, container.querySelector(`[data-filter="${key}"]`)?.value || '']));
  }
  function graphNotes(notes, filters = {}) {
    if (!isActive(filters)) return notes;
    const projects = notes.filter(note => matches(note, filters));
    if (!projects.length) return [];
    const bySlug = new Map(notes.map(note => [note.slug, note]));
    const included = new Set();
    function include(slug) {
      if (included.has(slug) || !bySlug.has(slug)) return;
      included.add(slug);
      if (slug === 'index') return;
      const parentPath = slug.split('/').slice(0,-1).join('/');
      const parent = slug.endsWith('/index') ? 'index' : bySlug.has(parentPath) ? parentPath : bySlug.has(parentPath + '/index') ? parentPath + '/index' : 'index';
      include(parent);
    }
    for (const project of projects) {
      include(project.slug);
      for (const target of project.links || []) if (bySlug.get(target)?.type !== 'project') include(target);
    }
    return notes.filter(note => included.has(note.slug));
  }
  return {split, matches, isActive, getFilters, writeFilters, filterHref, controls, readFilters, graphNotes};
});
