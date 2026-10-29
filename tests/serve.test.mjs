import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStaticServer } from '../scripts/serve.mjs';

test('preview serves pages, assets, font types, and HEAD requests', async t => {
  const parent = await mkdtemp(path.join(tmpdir(), 'jamboree-server-'));
  const root = path.join(parent, 'site');
  await mkdir(path.join(root, 'assets'), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<h1>Jamboree</h1>');
  await writeFile(path.join(root, 'assets', 'app.js'), 'console.log("wiki");');
  await writeFile(path.join(root, 'assets', 'font.ttf'), Buffer.from([0, 1, 0, 0]));
  const server = await createStaticServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(parent, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(base + '/?preview=1');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.equal(await home.text(), '<h1>Jamboree</h1>');
  const script = await fetch(base + '/assets/app.js');
  assert.match(script.headers.get('content-type'), /text\/javascript/);
  await script.arrayBuffer();
  const head = await fetch(base + '/assets/font.ttf', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'font/ttf');
  assert.equal(head.headers.get('content-length'), '4');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});

test('preview returns useful errors and confines files to the public directory', async t => {
  const parent = await mkdtemp(path.join(tmpdir(), 'jamboree-server-'));
  const root = path.join(parent, 'site');
  await mkdir(root);
  await writeFile(path.join(root, '.env'), 'not public');
  await writeFile(path.join(parent, 'outside.txt'), 'not public');
  if (process.platform !== 'win32') await symlink(path.join(parent, 'outside.txt'), path.join(root, 'escape.txt'));
  const server = await createStaticServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(parent, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const cases = [['/missing', 404], ['/.env', 403], ['/%2e%2e%2foutside.txt', 403], ['/%ZZ', 400], ['/%00', 400]];
  if (process.platform !== 'win32') cases.push(['/escape.txt', 403]);
  for (const [url, status] of cases) {
    const response = await fetch(base + url);
    assert.equal(response.status, status, url);
    await response.arrayBuffer();
  }
  const post = await fetch(base, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  await post.arrayBuffer();
});
