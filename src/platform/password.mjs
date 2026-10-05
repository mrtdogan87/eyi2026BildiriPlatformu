import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  const [, salt, expected] = (hash ?? '').split(':');
  // Keep work comparable for unknown users, without a usable fallback password.
  const actual = scryptSync(password, salt || 'unknown-user-fixed-salt', 64);
  const bytes = /^[a-f0-9]{128}$/.test(expected || '') ? Buffer.from(expected, 'hex') : Buffer.alloc(64);
  return timingSafeEqual(actual, bytes) && Boolean(salt && expected);
}
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
