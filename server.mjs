import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/model.mjs', ['model.mjs', 'text/javascript; charset=utf-8']],
]);
createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(req.method === 'HEAD' ? undefined : '{"status":"ok"}');
    return;
  }
  const asset = assets.get(path);
  if (!asset) {
    res.writeHead(404).end('Page not found');
    return;
  }
  try {
    const body = await readFile(new URL('./public/' + asset[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': asset[1] }).end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500).end('Unable to serve this page');
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
