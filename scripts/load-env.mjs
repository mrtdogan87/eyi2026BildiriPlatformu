import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function loadEnv() {
  process.chdir(root);
  // This checkout's file overrides inherited live settings. Never read ../.env.
  const path = resolve(root, '.env');
  if (existsSync(path)) Object.assign(process.env, parseEnv(readFileSync(path, 'utf8')));
  // Next must not silently override the checked file with another .env variant.
  for (const name of ['.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local']) {
    if (existsSync(resolve(root, name))) throw new Error(`Remove conflicting env file: ${name}`);
  }
}
