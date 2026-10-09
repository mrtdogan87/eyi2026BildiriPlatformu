import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEnvironment, assertMigrationTarget } from './environment.mjs';

const base = () => ({
  APP_ENV: 'local', DATABASE_URL: 'postgresql://aibildiri_v2:dummy@127.0.0.1:55432/aibildiri_v2',
  DIRECT_URL: 'postgresql://aibildiri_v2:dummy@127.0.0.1:55432/aibildiri_v2',
  APP_BASE_URL: 'http://127.0.0.1:3100', SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_local',
  DRAFT_SESSION_SECRET: 'd'.repeat(64), ADMIN_SESSION_SECRET: 'a'.repeat(64), ADMIN_PASSWORD: 'p'.repeat(32),
  FILE_STORAGE: 'database', MAIL_MODE: 'capture', MAIL_CAPTURE_DIR: '.local/mail',
});
test('dedicated local environment is accepted', () => assert.equal(assertEnvironment(base()).mode, 'local'));
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  for (const url of [
    'postgresql://aibildiri_v2:dummy@host.neon.tech:55432/aibildiri_v2',
    'postgresql://aibildiri_v2:dummy@ljoib4ke0c27qo09nkipwxhh:5432/aibildiri',
    'postgresql://aibildiri_v2:dummy@178.104.38.35:5432/aibildiri',
    'postgresql://aibildiri_v2:dummy@127.0.0.1:5432/aibildiri_v2',
    'postgresql://aibildiri_v2:dummy@127.0.0.1:55432/aibildiri',
  ]) test(`${key} rejects ${new URL(url).hostname}:${new URL(url).port}${new URL(url).pathname}`, () => assert.throws(() => assertEnvironment({ ...base(), [key]: url })));
}
for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'RESEND_API_KEY', 'RESEND_SENDER_EMAIL']) {
  test(`${key} cannot activate real delivery locally`, () => assert.throws(() => assertEnvironment({ ...base(), [key]: 'accidentally-inherited' })));
}
for (const overrides of [
  { MAIL_MODE: 'delivery' }, { MAIL_CAPTURE_DIR: 'public/uploads' }, { FILE_STORAGE: 's3' },
  { APP_ENV: '' }, { APP_BASE_URL: 'https://bildiriyonetim.stativera.store' },
  { SESSION_COOKIE_NAMESPACE: 'admin_session' }, { DRAFT_SESSION_SECRET: 'change-me' },
]) test(`rejects unsafe ${Object.keys(overrides)[0]}`, () => assert.throws(() => assertEnvironment({ ...base(), ...overrides })));
const preview = () => ({
  ...base(), APP_ENV: 'preview', SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_preview',
  APP_BASE_URL: 'https://v2-preview.example.invalid', V2_DB_HOST: 'db-v2-preview',
  DATABASE_URL: 'postgresql://aibildiri_v2_preview:dummy@db-v2-preview:5432/aibildiri_v2_preview',
  DIRECT_URL: 'postgresql://aibildiri_v2_preview:dummy@db-v2-preview:5432/aibildiri_v2_preview',
  MAIL_CAPTURE_DIR: '/app/.preview/mail', PREVIEW_ACCESS_USER: 'tester', PREVIEW_ACCESS_PASSWORD: 'x'.repeat(32),
});
test('preview requires private access credentials', () => {
  assert.equal(assertEnvironment(preview()).mode, 'preview');
  assert.throws(() => assertEnvironment({ ...preview(), PREVIEW_ACCESS_PASSWORD: '' }));
});
test('preview rejects current live DB even with v2 DB name', () => {
  const env = { ...preview(), V2_DB_HOST: '178.104.38.35', DATABASE_URL: 'postgresql://aibildiri_v2_preview:dummy@178.104.38.35:5432/aibildiri_v2_preview' };
  assert.throws(() => assertEnvironment(env));
});
const production = () => ({ ...preview(), APP_ENV: 'production', SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_production',
    V2_DB_HOST: 'dedicated-v2-db', APP_BASE_URL: 'https://kongre.stativera.store', MAIL_MODE: 'delivery', EMAIL_DELIVERY_ENABLED: 'true',
    DATABASE_URL: 'postgresql://aibildiri_v2_production:dummy@dedicated-v2-db:5432/aibildiri_v2_production',
    DIRECT_URL: 'postgresql://aibildiri_v2_production:dummy@dedicated-v2-db:5432/aibildiri_v2_production' });
test('production runtime accepts the chosen domain without migration authorization', () => {
  assert.equal(assertEnvironment(production()).mode, 'production');
});
for (const confirmation of [undefined, '', 'true', 'aibildiri_v2_preview', 'aibildiri_v2_production ']) {
  test(`production migration rejects confirmation ${JSON.stringify(confirmation)}`, () => {
    assert.throws(() => assertMigrationTarget({ ...production(), V2_PRODUCTION_MIGRATION_CONFIRM: confirmation }), /Production migrations require/);
  });
}
test('production migration accepts an explicit dedicated database confirmation', () => {
  assert.equal(assertMigrationTarget({ ...production(), V2_PRODUCTION_MIGRATION_CONFIRM: 'aibildiri_v2_production' }).mode, 'production');
});
test('local and preview migration do not need production confirmation', () => {
  assert.equal(assertMigrationTarget(base()).mode, 'local');
  assert.equal(assertMigrationTarget(preview()).mode, 'preview');
});
for (const host of ['ljoib4ke0c27qo09nkipwxhh', '178.104.38.35']) {
  test(`confirmed production migration still rejects the old live host: ${host}`, () => {
    const env = { ...production(), V2_DB_HOST: host, V2_PRODUCTION_MIGRATION_CONFIRM: 'aibildiri_v2_production' };
    for (const key of ['DATABASE_URL', 'DIRECT_URL']) env[key] = `postgresql://aibildiri_v2_production:dummy@${host}:5432/aibildiri_v2_production`;
    // Both URLs match V2_DB_HOST, so the old-host guard itself is exercised.
    assert.throws(() => assertMigrationTarget(env), /current live database/);
  });
}
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  for (const suffix of ['other:dummy@dedicated-v2-db:5432/aibildiri_v2_production', 'aibildiri_v2_production:dummy@dedicated-v2-db:5432/aibildiri']) {
    test(`confirmed production migration requires dedicated user/database in ${key}: ${suffix.split('@')[0].split(':')[0]}/${suffix.split('/').at(-1)}`, () => {
      assert.throws(() => assertMigrationTarget({ ...production(), [key]: `postgresql://${suffix}`, V2_PRODUCTION_MIGRATION_CONFIRM: 'aibildiri_v2_production' }), /dedicated database and user required/);
    });
  }
}
for (const domain of ['bildiriyonetim.stativera.store', 'eyi.mcbu.edu.tr', 'old-project.vercel.app']) {
  test(`confirmed production migration still rejects protected domain ${domain}`, () => {
    assert.throws(() => assertMigrationTarget({ ...production(), APP_BASE_URL: `https://${domain}`, V2_PRODUCTION_MIGRATION_CONFIRM: 'aibildiri_v2_production' }), /choose a separate v2 domain/);
  });
}
