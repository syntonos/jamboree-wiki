import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function isInside(root, filename) {
  const relative = path.relative(root, filename);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
}

export async function createStaticServer(directory = projectRoot) {
  const root = await realpath(directory);
  return createServer(async (request, response) => {
    const sendError = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      sendError(405, 'Method not allowed');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      sendError(400, 'Invalid URL');
      return;
    }
    if (pathname.includes('\0') || pathname.includes('\\')) {
      sendError(400, 'Invalid path');
      return;
    }
    if (pathname.split('/').some(segment => segment.startsWith('.'))) {
      sendError(403, 'Access denied');
      return;
    }
    try {
      let filename = path.resolve(root, '.' + pathname);
      if (!isInside(root, filename)) { sendError(403, 'Access denied'); return; }
      filename = await realpath(filename);
      if (!isInside(root, filename)) { sendError(403, 'Access denied'); return; }
      let info = await stat(filename);
      if (info.isDirectory()) {
        filename = await realpath(path.join(filename, 'index.html'));
        if (!isInside(root, filename)) { sendError(403, 'Access denied'); return; }
        info = await stat(filename);
      }
      if (!info.isFile()) { sendError(404, 'Not found'); return; }
      const body = request.method === 'HEAD' ? undefined : await readFile(filename);
      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
        'Content-Length': body ? body.length : info.size,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(body);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) sendError(404, 'Not found');
      else if (['EACCES', 'EPERM'].includes(error.code)) sendError(403, 'Access denied');
      else { console.error(error); sendError(500, 'Unable to serve file'); }
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  const host = process.env.HOST || '0.0.0.0';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const server = await createStaticServer();
    server.on('error', error => {
      console.error(`Preview server failed: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, host, () => console.log(`Jamboree preview listening on ${host}:${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
  }
}
