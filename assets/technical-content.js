/* Lazy, local-only renderers. Raw Markdown remains readable if rendering fails. */
(() => {
  const base = new URL('.', document.currentScript.src);
  const libraries = new Map(), revisions = new WeakMap();
  let diagramSequence = 0, diagramQueue = Promise.resolve();

  function library(name, file) {
    if (!libraries.has(name)) {
      libraries.set(name, new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(file, base).href;
        script.onload = () => resolve(window[name]);
        script.onerror = () => { libraries.delete(name); reject(new Error(`${name} could not load`)); };
        document.head.append(script);
      }));
    }
    return libraries.get(name);
  }

  async function enhance(root) {
    const revision = (revisions.get(root) || 0) + 1;
    revisions.set(root, revision);
    const current = () => root.isConnected && revisions.get(root) === revision;
    const math = [...root.querySelectorAll('.note-math:not([data-rendered])')];
    const diagrams = [...root.querySelectorAll('.note-diagram')];
    const jobs = [];
    if (math.length) jobs.push((async () => {
      try {
        const katex = await library('katex', 'vendor/katex/katex.min.js');
        if (!current()) return;
        for (const element of math) {
          const source = element.textContent;
          try {
            katex.render(source, element, {displayMode: element.dataset.mathDisplay === 'true', throwOnError: true, trust: false, maxExpand: 1000, maxSize: 10, output: 'htmlAndMathml'});
          } catch {
            element.textContent = source;
            element.classList.add('math-error');
            element.title = 'Unable to render this LaTeX expression';
          }
          element.dataset.rendered = 'true';
        }
      } catch {
        if (current()) math.forEach(element => { element.title = 'Math renderer unavailable; showing LaTeX source'; });
      }
    })());
    for (const figure of diagrams) {
      const job = async () => {
        if (!current()) return;
        const source = figure.querySelector('.mermaid-source');
        const output = figure.querySelector('.mermaid-output');
        const status = figure.querySelector('.diagram-status');
        try {
          const mermaid = await library('mermaid', 'vendor/mermaid/mermaid.min.js');
          if (!current()) return;
          const style = getComputedStyle(document.body);
          mermaid.initialize({
            startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
            maxTextSize: 50000, theme: 'base', fontFamily: 'JetBrains Mono, monospace',
            themeVariables: {
              darkMode: document.body.classList.contains('dark'),
              background: style.getPropertyValue('--bg').trim(),
              primaryColor: style.getPropertyValue('--panel').trim(),
              primaryTextColor: style.getPropertyValue('--ink').trim(),
              primaryBorderColor: style.getPropertyValue('--line').trim(),
              lineColor: style.getPropertyValue('--muted').trim(),
              secondaryColor: style.getPropertyValue('--soft').trim(),
              tertiaryColor: style.getPropertyValue('--bg').trim()
            },
            flowchart: {htmlLabels: false}
          });
          const {svg} = await mermaid.render('note-diagram-' + (++diagramSequence), source.textContent);
          if (!current()) return;
          output.innerHTML = svg;
          source.hidden = true;
          status.textContent = '';
        } catch {
          if (!current()) return;
          output.replaceChildren();
          source.hidden = false;
          status.textContent = 'Unable to render this Mermaid diagram. Check the source above.';
        }
      };
      diagramQueue = diagramQueue.then(job, job);
      jobs.push(diagramQueue);
    }
    await Promise.all(jobs);
  }
  window.JamboreeTechnical = {enhance};
})();
