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
test('production migrations cannot run through P02 scripts', () => {
  const env = { ...preview(), APP_ENV: 'production', SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_production',
    V2_DB_HOST: 'dedicated-v2-db', APP_BASE_URL: 'https://v2.example.invalid', MAIL_MODE: 'delivery', EMAIL_DELIVERY_ENABLED: 'true',
    DATABASE_URL: 'postgresql://aibildiri_v2_production:dummy@dedicated-v2-db:5432/aibildiri_v2_production',
    DIRECT_URL: 'postgresql://aibildiri_v2_production:dummy@dedicated-v2-db:5432/aibildiri_v2_production' };
  assert.throws(() => assertMigrationTarget(env), /Production migrations/);
});
