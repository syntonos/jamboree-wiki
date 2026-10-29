import { readdir, readFile, writeFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import content from '../assets/content-utils.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(filename));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(filename);
  }
  // Compare path segments so existing note and graph ordering stays unchanged.
  return files.sort((a, b) => {
    const left = a.split(path.sep), right = b.split(path.sep);
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
    }
    return left.length - right.length;
  });
}

export async function build(root = projectRoot, { checkOnly = false } = {}) {
  const contentDirectory = path.join(root, 'content');
  const notes = [], sources = new Map();
  for (const filename of await markdownFiles(contentDirectory)) {
    const source = (await readFile(filename, 'utf8')).replace(/\r\n/g, '\n');
    const sections = source.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
    if (!sections) throw new Error(`${path.relative(root, filename)}: expected Markdown frontmatter between --- lines`);
    const note = {};
    for (const line of sections[1].split('\n')) {
      if (!line.trim()) continue;
      const separator = line.indexOf(':');
      if (separator < 1 || !line.slice(0, separator).trim()) {
        throw new Error(`${path.relative(root, filename)}: expected a frontmatter field as key: value`);
      }
      // Keep scalar values as strings, including "true" and zero-padded order numbers.
      note[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
    note.slug = path.relative(contentDirectory, filename).split(path.sep).join('/').replace(/\.md$/, '');
    note.body = sections[2].trim();
    note.links = [];
    note.backlinks = [];
    const bodyIndex = source.length - sections[2].length;
    const leadingWhitespace = sections[2].length - sections[2].trimStart().length;
    sources.set(note.slug, {
      filename: path.relative(root, filename),
      bodyLineOffset: source.slice(0, bodyIndex + leadingWhitespace).split('\n').length - 1,
      imageLine: source.split('\n').findIndex(line => /^image\s*:/.test(line)) + 1,
    });
    notes.push(note);
  }

  const bySlug = new Map(notes.map(note => [note.slug, note]));
  const headings = new Map(notes.map(note => [note.slug, new Set(content.headingIds(note.body))]));
  const errors = [];
  const rootReal = await realpath(root);
  const fileChecks = new Map();
  async function validateAsset(assetPath) {
    if (!fileChecks.has(assetPath)) fileChecks.set(assetPath, (async () => {
      try {
        const filename = await realpath(path.join(root, ...assetPath.split('/')));
        const relative = path.relative(rootReal, filename);
        if (path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) return 'local file escapes the site root';
        if (!(await stat(filename)).isFile()) return 'local download is not a file: ' + assetPath;
        return null;
      } catch (error) {
        if (['ENOENT', 'ENOTDIR'].includes(error.code)) return 'local file does not exist: ' + assetPath;
        return 'local file cannot be read: ' + assetPath;
      }
    })());
    return fileChecks.get(assetPath);
  }
  async function validateReference(note, reference, image = false) {
    const resolved = content.resolveLink(reference.target, note.slug, notes);
    let problem;
    if (resolved.kind === 'invalid') problem = resolved.reason;
    else if (resolved.kind === 'asset') problem = await validateAsset(resolved.path);
    else if (image && (resolved.kind !== 'external' || !/^(?:https?:|\/\/)/i.test(resolved.href))) problem = 'image must point to a local file or an HTTP(S) URL';
    else if ((resolved.kind === 'note' || resolved.kind === 'anchor') && resolved.anchor && !headings.get(resolved.slug)?.has(resolved.anchor)) problem = 'heading does not exist: ' + resolved.slug + '#' + resolved.anchor;
    if (problem) {
      errors.push(`${sources.get(note.slug).filename}:${reference.line}: ${problem} (${reference.target})`);
      return;
    }
    if (resolved.kind === 'note' && !resolved.virtual && resolved.slug !== note.slug) note.links.push(resolved.slug);
  }
  for (const note of notes) {
    const source = sources.get(note.slug);
    for (const reference of content.extractLinks(note.body)) {
      await validateReference(note, {...reference, line: reference.line + source.bodyLineOffset}, reference.image);
    }
    if (note.image) await validateReference(note, {target: note.image, line: source.imageLine || 1}, true);
    note.links = [...new Set(note.links)].sort();
  }
  if (errors.length) throw new Error(`Broken internal links (${errors.length}):\n${errors.join('\n')}`);
  for (const note of notes) for (const slug of note.links) bySlug.get(slug).backlinks.push(note.slug);
  for (const note of notes) note.backlinks = [...new Set(note.backlinks)].sort();
  if (!checkOnly) await writeFile(path.join(root, 'assets', 'notes.json'), JSON.stringify(notes, null, 2) + '\n');
  return notes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const checkOnly = process.argv.includes('--check');
    const notes = await build(projectRoot, {checkOnly});
    const links = notes.reduce((count, note) => count + note.links.length, 0);
    console.log(`${checkOnly ? 'Checked' : 'Built'} ${notes.length} Markdown notes; ${links} internal note links verified`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
