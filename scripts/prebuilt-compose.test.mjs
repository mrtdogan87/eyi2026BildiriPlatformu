import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePrebuiltCompose, parseOptions, writePrebuiltCompose } from './generate-prebuilt-compose.mjs';

const require = createRequire(import.meta.url);
const { load, dump } = require('js-yaml');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(resolve(root, 'deploy/compose.production.yml'), 'utf8');
const options = { webImage: 'stativera/kongre-web:prod-test-arm64', toolsImage: 'stativera/kongre-tools:prod-test-arm64' };

test('prebuilt artifact changes only builds/image selection and preserves isolation, profiles and runtime values', () => {
  const original = load(source);
  const generated = load(generatePrebuiltCompose(source, options));
  const expected = structuredClone(original);
  delete expected['x-tools-build'];
  for (const [name, service] of Object.entries(expected.services)) {
    if (name === 'db-v2-production') continue;
    delete service.build;
    service.image = name === 'app' ? options.webImage : options.toolsImage;
    service.pull_policy = 'never';
  }
  assert.deepEqual(generated, expected);
  assert.doesNotMatch(JSON.stringify(generated), /"build":/);
  assert.deepEqual(generated.services.migrate.profiles, ['migration']);
  assert.deepEqual(generated.services.bootstrap.profiles, ['bootstrap']);
  assert.equal(generated.services.migrate.environment.V2_PRODUCTION_MIGRATION_CONFIRM, '${V2_PRODUCTION_MIGRATION_CONFIRM:-}');
  assert.equal(generated.services.bootstrap.environment.V2_BOOTSTRAP_CONFIRM, '${V2_BOOTSTRAP_CONFIRM:-}');
  assert.match(generated.services.app.environment.DATABASE_URL, /\$\{V2_PRODUCTION_DB_PASSWORD:\?/);
  assert.equal(generated.services.app.environment.SMTP_PASS, '${SMTP_PASS:-}');
});

test('requires both explicit image references and rejects implicit latest, interpolation and malformed input', () => {
  assert.deepEqual(parseOptions(['--web-image', options.webImage, '--tools-image', options.toolsImage]), options);
  const digest = `registry.example:5000/team/tools@sha256:${'a'.repeat(64)}`;
  assert.equal(parseOptions(['--tools-image', digest, '--web-image', options.webImage]).toolsImage, digest);
  for (const args of [[], ['--web-image', options.webImage], ['--output', '/tmp/unwanted'], ['--web-image', options.webImage, '--web-image', options.webImage]]) {
    assert.throws(() => parseOptions(args));
  }
  for (const value of ['repo/image', 'repo/image:latest', '${WEB_IMAGE}', 'repo/image:tag\n', 'https://repo/image:tag', 'user:password@registry/image:tag', 'repo/image:$(secret)']) {
    assert.throws(() => generatePrebuiltCompose(source, { ...options, webImage: value }));
  }
});

test('new build services fail closed instead of leaking a build into the artifact', () => {
  const changed = load(source);
  changed.services.unreviewed = { build: '.' };
  assert.throws(() => generatePrebuiltCompose(dump(changed), options), /Unexpected build block/);
  delete changed.services.app.build;
  assert.throws(() => generatePrebuiltCompose(dump(changed), options), /Missing expected production build service: app/);
});

test('writes only the protected generated file without loading env files or mutating source', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'kongre-prebuilt-'));
  try {
    mkdirSync(resolve(temporary, 'deploy'));
    writeFileSync(resolve(temporary, 'deploy/compose.production.yml'), source);
    writeFileSync(resolve(temporary, '.env'), 'DRAFT_SESSION_SECRET=fixture-must-not-appear\nSMTP_PASS=fixture-mail-secret\n');
    const output = writePrebuiltCompose(temporary, options);
    const generated = readFileSync(output, 'utf8');
    assert.equal(output, resolve(temporary, '.local/compose.production.prebuilt.yml'));
    assert.equal(statSync(output).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(resolve(temporary, '.local')), ['compose.production.prebuilt.yml']);
    assert.equal(readFileSync(resolve(temporary, 'deploy/compose.production.yml'), 'utf8'), source);
    assert.doesNotMatch(generated, /fixture-must-not-appear|fixture-mail-secret/);
    assert.equal(load(generated).services.app.environment.DRAFT_SESSION_SECRET, '${DRAFT_SESSION_SECRET:?Set a fresh session secret}');
    writePrebuiltCompose(temporary, options);
    assert.equal(readFileSync(output, 'utf8'), generated, 'repeated generation remains deterministic');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
