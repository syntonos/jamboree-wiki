(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JamboreeProjects = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const split = value => [...new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean))];
  const equal = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const isActive = filters => ['status', 'discipline', 'tag'].some(key => String(filters[key] || '').trim());
  let controlSequence = 0;
  let openDropdown = null;
  let dropdownEventsReady = false;
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
    const prefix = 'project-filter-' + (++controlSequence);
    const projects = notes.filter(note => note.type === 'project');
    const statuses = [...new Set(['current', 'past', 'future', ...projects.map(note => note.status).filter(Boolean)])];
    const disciplines = [...new Set(projects.flatMap(note => split(note.discipline)))].sort();
    const tags = [...new Set(projects.flatMap(note => split(note.tags)))].sort();
    const select = (key, title, values, all) => {
      const value = filters[key] || '';
      const choices = [...values];
      if (value && !choices.includes(value)) choices.push(value);
      const id = prefix + '-' + key;
      return `<div class="project-filter"><label id="${id}-label" for="${id}">${title}</label><select id="${id}" data-filter="${key}"><option value="">${all}</option>${choices.map(option => `<option value="${escape(option)}" ${option === value ? 'selected' : ''}>${escape(key === 'status' ? option[0].toUpperCase() + option.slice(1) : option)}</option>`).join('')}</select></div>`;
    };
    return `<div class="project-filters" role="search" aria-label="Filter projects">${select('status','Status',statuses,'All statuses')}${select('discipline','Discipline',disciplines,'All disciplines')}${select('tag','Skill',tags,'All skills')}<button type="button" data-filter-reset>Reset filters</button></div>`;
  }
  function readFilters(container) {
    return Object.fromEntries(['status','discipline','tag'].map(key => [key, container.querySelector(`[data-filter="${key}"]`)?.value || '']));
  }
  // Keep real select elements as the data source and enhance only their presentation.
  // Repeated calls also sync programmatic changes, such as resetting all filters.
  function enhanceControls(container) {
    if (!container || typeof document === 'undefined') return;
    if (!dropdownEventsReady) {
      document.addEventListener('pointerdown', event => {
        if (openDropdown && !openDropdown.wrapper.contains(event.target)) openDropdown.close();
      });
      document.addEventListener('focusin', event => {
        if (openDropdown && !openDropdown.wrapper.contains(event.target)) openDropdown.close();
      });
      document.addEventListener('scroll', event => {
        if (openDropdown && !openDropdown.list.contains(event.target)) openDropdown.close();
      }, true);
      window.addEventListener('resize', () => openDropdown?.position());
      window.addEventListener('hashchange', () => openDropdown?.close());
      window.addEventListener('popstate', () => openDropdown?.close());
      dropdownEventsReady = true;
    }
    for (const select of container.querySelectorAll('select[data-filter]')) {
      if (select.dropdownControl) { select.dropdownControl.sync(); continue; }
      const wrapper = document.createElement('div');
      wrapper.className = 'filter-select';
      select.before(wrapper);
      wrapper.append(select);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-select-trigger';
      button.id = select.id + '-trigger';
      button.setAttribute('role', 'combobox');
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-labelledby', select.id + '-label');
      const value = document.createElement('span');
      value.className = 'filter-select-value';
      button.append(value);
      button.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>');
      const list = document.createElement('div');
      list.id = select.id + '-options';
      list.className = 'filter-select-options';
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-labelledby', select.id + '-label');
      list.hidden = true;
      button.setAttribute('aria-controls', list.id);
      wrapper.append(button, list);
      select.classList.add('filter-select-native');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      const label = document.getElementById(select.id + '-label');
      if (label) label.htmlFor = button.id;
      let active = select.selectedIndex;
      let typeBuffer = '';
      let lastType = 0;

      function position() {
        const rect = button.getBoundingClientRect();
        const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24);
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const upward = below < 220 && above > below;
        const height = Math.max(40, Math.min(280, upward ? above - 6 : below - 6));
        list.style.width = width + 'px';
        list.style.maxHeight = height + 'px';
        list.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + 'px';
        list.style.top = upward ? Math.max(12, rect.top - Math.min(list.scrollHeight, height) - 6) + 'px' : rect.bottom + 6 + 'px';
      }
      function highlight(index) {
        active = Math.max(0, Math.min(index, select.options.length - 1));
        [...list.children].forEach((option, i) => option.classList.toggle('is-active', i === active));
        button.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView({block:'nearest'});
      }
      function close() {
        list.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        button.removeAttribute('aria-activedescendant');
        if (openDropdown === api) openDropdown = null;
        typeBuffer = '';
      }
      function open() {
        if (openDropdown && openDropdown !== api) openDropdown.close();
        openDropdown = api;
        list.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        position();
        highlight(select.selectedIndex);
      }
      function sync() {
        value.textContent = select.selectedOptions[0]?.textContent || '';
        button.title = value.textContent;
        [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === select.selectedIndex)));
        if (!list.hidden) highlight(select.selectedIndex);
      }
      function choose(index) {
        select.selectedIndex = index;
        sync();
        close();
        button.focus({preventScroll:true});
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
      [...select.options].forEach((option, index) => {
        const item = document.createElement('div');
        item.id = list.id + '-' + index;
        item.className = 'filter-select-option';
        item.setAttribute('role', 'option');
        item.textContent = option.textContent;
        item.addEventListener('pointerdown', event => event.preventDefault());
        item.addEventListener('pointermove', () => highlight(index));
        item.addEventListener('click', () => choose(index));
        list.append(item);
      });
      button.addEventListener('click', () => list.hidden ? open() : close());
      button.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const wasClosed = list.hidden;
        if (['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)) {
          event.preventDefault();
          if (wasClosed) open();
          else if (event.key === 'Enter' || event.key === ' ') { choose(active); return; }
          if (event.key === 'Home') highlight(0);
          else if (event.key === 'End') highlight(select.options.length - 1);
          else if (!wasClosed && event.key === 'ArrowDown') highlight(active + 1);
          else if (!wasClosed && event.key === 'ArrowUp') highlight(active - 1);
        } else if (event.key === 'Escape' && !wasClosed) { event.preventDefault(); event.stopPropagation(); close(); }
        else if (event.key === 'Tab') close();
        else if (event.key.length === 1 && event.key !== ' ') {
          event.preventDefault();
          if (wasClosed) open();
          const now = Date.now();
          typeBuffer = now - lastType > 700 ? event.key : typeBuffer + event.key;
          lastType = now;
          const query = [...typeBuffer].every(char => char.toLowerCase() === typeBuffer[0].toLowerCase()) ? typeBuffer[0] : typeBuffer;
          const options = [...select.options];
          for (let offset = 1; offset <= options.length; offset++) {
            const index = (active + offset) % options.length;
            if (options[index].textContent.toLowerCase().startsWith(query.toLowerCase())) { highlight(index); break; }
          }
        }
      });
      select.addEventListener('change', () => { sync(); close(); });
      const api = {wrapper, list, close, position, sync};
      select.dropdownControl = api;
      sync();
    }
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
  return {split, matches, isActive, getFilters, writeFilters, filterHref, controls, readFilters, enhanceControls, graphNotes};
});
