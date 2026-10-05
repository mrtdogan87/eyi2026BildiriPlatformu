import { assertEnvironment } from '../../scripts/environment.mjs';

export function getEnvironment() {
  return assertEnvironment();
}

export function sessionCookieName(name: string) {
  return `${getEnvironment().namespace}_${name}`;
}

export function secureSessionCookie() {
  return getEnvironment().mode !== 'local';
}
