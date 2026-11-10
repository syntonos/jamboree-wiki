(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JamboreeGraphData = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  function color(node, dark = false) {
    const lightness = dark ? node.darkLightness : node.lightness;
    return `hsl(${node.hue} ${dark ? 28 : 25}% ${Math.round(lightness * 1000) / 1000}%)`;
  }

  function model(notes) {
    const nodes = notes.filter(note => !['index', 'about'].includes(note.slug)).map(note => {
      const folder = note.slug.includes('/') ? note.slug.split('/')[0] : '';
      return {...note, degree: 0, hue: folder === 'projects' ? 215 : folder === 'guides' ? 190 : 210};
    });
    const bySlug = new Map(nodes.map(node => [node.slug, node]));
    const edges = [];
    const adjacent = new Map(nodes.map(node => [node.slug, new Set()]));
    for (const source of nodes) {
      // Vault stores each note's outgoing links in a Set, but reciprocal note
      // links remain two separate directed edges in its graph.
      for (const slug of new Set(Array.isArray(source.links) ? source.links : [])) {
        const target = bySlug.get(slug);
        if (!target || target === source) continue;
        edges.push({source, target});
        source.degree++; target.degree++;
        adjacent.get(source.slug).add(target.slug);
        adjacent.get(target.slug).add(source.slug);
      }
    }

    const visited = new Set();
    for (const first of nodes) {
      if (visited.has(first.slug)) continue;
      const component = [first];
      visited.add(first.slug);
      for (let cursor = 0; cursor < component.length; cursor++) {
        for (const slug of adjacent.get(component[cursor].slug)) {
          if (visited.has(slug)) continue;
          visited.add(slug); component.push(bySlug.get(slug));
        }
      }
      const central = [...component].sort((a, b) => b.degree - a.degree || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))[0];
      const distances = new Map([[central.slug, 0]]);
      const queue = [central];
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const node = queue[cursor];
        for (const slug of adjacent.get(node.slug)) {
          if (distances.has(slug)) continue;
          distances.set(slug, distances.get(node.slug) + 1); queue.push(bySlug.get(slug));
        }
      }
      const depth = Math.max(...distances.values());
      for (const node of component) {
        node.distance = distances.get(node.slug);
        node.centralSlug = central.slug;
        const fraction = depth ? node.distance / depth : 1;
        node.lightness = 34 + 38 * fraction;
        node.darkLightness = 42 + 38 * fraction;
        node.color = color(node);
        node.darkColor = color(node, true);
      }
    }
    return {nodes, edges};
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
  return {model, localModel, color};
});
