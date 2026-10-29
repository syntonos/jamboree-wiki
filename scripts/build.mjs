import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export async function build(root = projectRoot) {
  const contentDirectory = path.join(root, 'content');
  const notes = [];
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
    notes.push(note);
  }
  await writeFile(path.join(root, 'assets', 'notes.json'), JSON.stringify(notes, null, 2) + '\n');
  return notes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const notes = await build();
    console.log(`Built ${notes.length} Markdown notes`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
