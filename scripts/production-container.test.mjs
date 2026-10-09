import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
// Installed by the repository's ESLint toolchain; parsing anchors verifies the
// effective Compose configuration, not just individual snippets of YAML text.
const { load } = require('js-yaml');
const ts = require('typescript');
const read = path => readFileSync(resolve(root, path), 'utf8');
const compose = load(read('deploy/compose.production.yml'));
const dockerfile = read('deploy/Dockerfile.production');
const services = compose.services;

test('default deployment has only a separate DB, web app and two workers', () => {
  assert.deepEqual(Object.keys(services).filter(name => !services[name].profiles), ['db-v2-production', 'app', 'mail-worker', 'cms-worker']);
  assert.equal(services['db-v2-production'].image, 'postgres:16-alpine');
  assert.equal(services['db-v2-production'].environment.POSTGRES_DB, 'aibildiri_v2_production');
  assert.equal(services['db-v2-production'].environment.POSTGRES_USER, 'aibildiri_v2_production');
  assert.deepEqual(services['db-v2-production'].volumes, ['v2-production-db:/var/lib/postgresql/data']);
  assert.deepEqual(Object.keys(compose.volumes), ['v2-production-db']);
  for (const service of Object.values(services)) {
    assert.equal(service.ports, undefined, 'no database or app host ports may be published');
    assert.equal(service.network_mode, undefined);
    assert.equal(service.env_file, undefined, 'runtime file must not be mounted or copied into a container');
    assert.equal(service.build?.args, undefined, 'real secrets must not become build arguments');
  }
  assert.deepEqual(services.app.expose, ['3000']);
});

test('runtime services share fixed production isolation and cannot migrate or bootstrap', () => {
  for (const name of ['app', 'mail-worker', 'cms-worker']) {
    const service = services[name];
    const env = service.environment;
    assert.equal(env.APP_ENV, 'production');
    assert.equal(env.APP_BASE_URL, 'https://kongre.stativera.store');
    assert.equal(env.V2_DB_HOST, 'db-v2-production');
    assert.equal(env.SESSION_COOKIE_NAMESPACE, 'aibildiri_v2_production');
    assert.equal(env.FILE_STORAGE, 'database');
    assert.equal(env.DATABASE_URL, env.DIRECT_URL);
    assert.match(env.DATABASE_URL, /^postgresql:\/\/aibildiri_v2_production:\$\{V2_PRODUCTION_DB_PASSWORD:\?[^}]+\}@db-v2-production:5432\/aibildiri_v2_production$/);
    assert.equal(env.V2_PRODUCTION_MIGRATION_CONFIRM, undefined);
    assert.equal(env.V2_BOOTSTRAP_CONFIRM, undefined);
    assert.doesNotMatch(JSON.stringify(service.command ?? []), /migrate|bootstrap|seed/);
    assert.equal(service.restart, 'unless-stopped');
    assert.equal(service.init, true);
    assert.ok(service.healthcheck?.test.length);
    assert.equal(service.depends_on['db-v2-production'].condition, 'service_healthy');
  }
});

test('migration and account bootstrap need separate opt-in jobs', () => {
  assert.deepEqual(services.migrate.profiles, ['migration']);
  assert.deepEqual(services.migrate.command, ['node', 'scripts/run.mjs', 'migrate']);
  assert.equal(services.migrate.environment.V2_PRODUCTION_MIGRATION_CONFIRM, '${V2_PRODUCTION_MIGRATION_CONFIRM:-}');
  assert.deepEqual(services.bootstrap.profiles, ['bootstrap']);
  assert.deepEqual(services.bootstrap.command, ['node', 'scripts/bootstrap-production.mjs', '--stdin']);
  assert.equal(services.bootstrap.environment.V2_BOOTSTRAP_CONFIRM, '${V2_BOOTSTRAP_CONFIRM:-}');
  assert.equal(services.bootstrap.stdin_open, true);
  assert.equal(services.migrate.restart, 'no');
  assert.equal(services.bootstrap.restart, 'no');
  for (const env of [services.migrate.environment, services.bootstrap.environment]) {
    assert.ok(!Object.keys(env).some(key => /PASSWORD_HASH|ADMIN_PASSWORD|BOOTSTRAP_EMAIL/.test(key)));
  }
  const exampleKeys = read('deploy/production.env.example').split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=')[0]);
  assert.ok(!exampleKeys.includes('V2_PRODUCTION_MIGRATION_CONFIRM'));
  assert.ok(!exampleKeys.includes('V2_BOOTSTRAP_CONFIRM'));
});

test('Linux target installs native dependencies and ships PDF assets without build secrets', () => {
  assert.match(dockerfile, /FROM node:24-bookworm-slim AS base/);
  assert.match(dockerfile, /ca-certificates openssl/);
  assert.match(dockerfile, /npm ci --include=optional/);
  assert.match(dockerfile, /npm ci --omit=dev --include=optional/);
  assert.match(dockerfile, /FROM base AS runner/);
  assert.match(dockerfile, /COPY --from=builder --chown=node:node \/app\/data \.\/data/);
  assert.match(dockerfile, /CMD \["node", "deploy\/start-production.mjs"\]/);
  assert.doesNotMatch(dockerfile, /^ARG\s/m);
  assert.doesNotMatch(dockerfile, /^RUN .*migrate|^RUN .*seed|^RUN .*bootstrap/m);
  assert.doesNotMatch(dockerfile, /^COPY .*node_modules/m);
  assert.ok(existsSync(resolve(root, 'data/fonts/LiberationSans-Regular.ttf')));
  assert.ok(existsSync(resolve(root, 'data/fonts/LiberationSerif-Regular.ttf')));
});

function localImportGraph(entry, seen = new Set()) {
  const path = resolve(root, entry);
  if (seen.has(path)) return seen;
  assert.ok(existsSync(path), `missing local import: ${relative(root, path)}`);
  seen.add(path);
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && !node.isTypeOnly && !node.importClause?.isTypeOnly) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith('.')) localImportGraph(relative(root, resolve(dirname(path), specifier)), seen);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return seen;
}

test('both worker images contain their full local runtime import graphs', () => {
  const graph = new Set([...localImportGraph('scripts/mail-worker.mjs'), ...localImportGraph('scripts/cms-worker.mjs')]);
  assert.ok([...graph].some(path => path.endsWith('/src/platform/roles.mjs')));
  assert.ok([...graph].some(path => path.endsWith('/src/modules/certificates/eligibility.mjs')));
  assert.ok([...graph].some(path => path.endsWith('/src/modules/payments/core.ts')));
  for (const path of graph) assert.match(relative(root, path), /^(src|scripts)\//);
  for (const file of [dockerfile.split('FROM base AS tools')[1], read('deploy/Dockerfile.preview').split(' AS worker')[1]]) {
    assert.match(file, /COPY src \.\/src/);
    assert.match(file, /COPY scripts \.\/scripts/);
  }
  assert.match(read('deploy/Dockerfile.preview'), /FROM node:24-alpine AS worker/);
});

test('Docker context excludes env/backup/native state while retaining schema migrations', () => {
  const rules = new Set(read('.dockerignore').split('\n').filter(Boolean));
  for (const pattern of ['.env', '.env.*', '**/.env', '**/.env.*', '.local', '.preview', '.recovery', 'node_modules', '.next', 'backups', '**/backups', '**/*.dump', '**/*.backup', '**/*.sql', '**/*.sql.gz', '**/*.pem', '**/*.key']) {
    assert.ok(rules.has(pattern), `missing build-context protection: ${pattern}`);
  }
  assert.ok(rules.has('!prisma/migrations/**/migration.sql'));
});

test('standalone entry refuses invalid configuration before trying to load server.js', () => {
  const result = spawnSync(process.execPath, ['deploy/start-production.mjs'], { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH, APP_ENV: 'production' } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsafe or missing v2 configuration/);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
});

test('worker healthchecks detect missing/stale markers and accept a recent completed batch', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'kongre-worker-health-'));
  const marker = resolve(temporary, 'heartbeat');
  const check = () => spawnSync(process.execPath, ['deploy/worker-healthcheck.mjs', marker, '120'], { cwd: root }).status;
  try {
    assert.equal(check(), 1);
    writeFileSync(marker, new Date().toISOString());
    assert.equal(check(), 0);
    const stale = new Date(Date.now() - 180000);
    utimesSync(marker, stale, stale);
    assert.equal(check(), 1);
    for (const [name, prefix] of [['mail-worker', 'MAIL'], ['cms-worker', 'CMS']]) {
      assert.equal(services[name].environment[`${prefix}_WORKER_HEARTBEAT_FILE`], `/tmp/${name}-heartbeat`);
      assert.equal(services[name].healthcheck.test[3], `/tmp/${name}-heartbeat`);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
