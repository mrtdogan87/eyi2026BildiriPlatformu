// Run only in the disposable Docker namespace created by isolated-local.mjs.
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { spawn } from 'node:child_process';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';

loadEnv();
assertLocal();
if (process.env.ISOLATED_LOCAL_TEST !== 'synthetic-only') throw new Error('Disposable test marker required');
const externalHost = 'kongre-test.localhost:3102';
const internalOrigin = 'http://127.0.0.1:3100';
const child = spawn(process.execPath, ['scripts/run.mjs', 'dev'], { stdio: 'inherit', env: process.env });
const server = createServer((incoming, response) => {
  if (![externalHost, '127.0.0.1:3102'].includes(incoming.headers.host)) {
    response.writeHead(400); response.end('Use the isolated test hostname.'); return;
  }
  const headers = { ...incoming.headers, host: '127.0.0.1:3100' };
  // Only this proxy's exact browser origin is mapped; foreign origins still fail the app check.
  if (headers.origin === `http://${externalHost}`) headers.origin = internalOrigin;
  if (headers.referer?.startsWith(`http://${externalHost}/`)) headers.referer = headers.referer.replace(`http://${externalHost}`, internalOrigin);
  const upstream = request({ hostname: '127.0.0.1', port: 3100, path: incoming.url, method: incoming.method, headers }, result => {
    const outputHeaders = { ...result.headers };
    if (outputHeaders.location?.startsWith(internalOrigin)) outputHeaders.location = outputHeaders.location.replace(internalOrigin, `http://${externalHost}`);
    response.writeHead(result.statusCode || 502, outputHeaders);
    result.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(503); response.end('The isolated test server is starting.'); });
  incoming.pipe(upstream);
});
server.on('upgrade', (incoming, socket, head) => {
  if (incoming.headers.host !== externalHost) { socket.destroy(); return; }
  const headers = { ...incoming.headers, host: '127.0.0.1:3100' };
  if (headers.origin === `http://${externalHost}`) headers.origin = internalOrigin;
  const upstream = connect(3100, '127.0.0.1', () => {
    upstream.write(`${incoming.method} ${incoming.url} HTTP/${incoming.httpVersion}\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});
server.listen(3101, '0.0.0.0');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); server.close(); });
child.on('exit', code => { server.close(); process.exitCode = code ?? 1; });
