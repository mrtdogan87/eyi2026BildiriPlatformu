import { stat } from 'node:fs/promises';

// Workers touch the marker only after completing a batch. An alive process with
// a lost DB connection or a stuck batch must not remain healthy indefinitely.
const [path, maxAgeSeconds] = process.argv.slice(2);
const maxAge = Number(maxAgeSeconds) * 1000;
try {
  if (!path || !Number.isFinite(maxAge) || maxAge <= 0) throw new Error('Invalid healthcheck arguments');
  const marker = await stat(path);
  const age = Date.now() - marker.mtimeMs;
  if (!marker.isFile() || age < -5000 || age > maxAge) process.exitCode = 1;
} catch {
  process.exitCode = 1;
}
