import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { hashPassword } from '../src/platform/password.mjs';
import { profileConfiguration } from '../src/modules/congress/configuration.ts';

loadEnv(); assertLocal();
if (process.env.ISOLATED_LOCAL_TEST !== 'synthetic-only') throw new Error('Run this check only through scripts/isolated-local.mjs exec');
const db = new PrismaClient(), suffix = randomUUID().slice(0, 8), jar = new Map(), checks = [];
const pass = message => { checks.push(message); console.log('PASS ' + message); };
async function request(path, { method = 'GET', body, status = 200 } = {}) {
  const form = body instanceof FormData;
  const response = await fetch(process.env.APP_BASE_URL + path, {
    method,
    headers: { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join(';'), ...(body && !form ? { 'content-type': 'application/json' } : {}) },
    body: body ? form ? body : JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${data.error ?? response.status}`);
  if (status === 409) assert.match(data.error, /kongre.*değişti|sayfa eski/i);
  for (const cookie of response.headers.getSetCookie()) {
    const [key, ...value] = cookie.split(';')[0].split('=');
    if (value.join('=')) jar.set(key, value.join('=')); else jar.delete(key);
  }
  return data;
}
const select = congressId => request('/api/platform/context', { method: 'POST', body: { congressId } });
const site = () => request('/api/platform/site');
const settings = () => request('/api/platform/congresses/settings');
const patchSite = (body, status) => request('/api/platform/site', { method: 'PATCH', body, status });
const patchSettings = (body, status) => request('/api/platform/congresses/settings', { method: 'PATCH', body, status });
const visibility = (body, status) => request('/api/platform/site/assets/logo', { method: 'PATCH', body, status });
async function upload(congressId, siteVersion, bytes, status) {
  const body = new FormData();
  if (congressId !== undefined) body.set('congressId', congressId);
  body.set('siteVersion', String(siteVersion));
  body.set('file', new File([bytes], 'synthetic-logo.png', { type: 'image/png' }));
  return request('/api/platform/site/assets/logo', { method: 'PUT', body, status });
}
const withoutId = input => { const body = { ...input }; delete body.congressId; return body; };
async function saved(id) {
  return db.congress.findUniqueOrThrow({ where: { id }, include: { siteAssets: true, modules: true } });
}

try {
  const password = 'Context-check-' + randomBytes(24).toString('hex');
  const organization = await db.organization.create({ data: { name: `Context ${suffix} (synthetic)` } });
  const user = await db.platformUser.create({ data: {
    email: `context-${suffix}@example.invalid`, name: 'Synthetic context organizer', passwordHash: hashPassword(password),
    organizations: { create: { organizationId: organization.id, organizer: true } },
  } });
  const configuration = profileConfiguration('REGISTRATION_ONLY');
  const makeCongress = async label => db.congress.create({ data: {
    organizationId: organization.id, name: `Context ${label} ${suffix}`, slug: `context-${label.toLowerCase()}-${suffix}`, year: 2026,
    configuration, siteVersion: 0, configVersion: 0,
    modules: { create: [{ key: 'REGISTRATION', enabled: true }, { key: 'SUBMISSIONS', enabled: false }] },
    siteAssets: { create: { kind: 'LOGO', originalName: `original-${label}.webp`, mimeType: 'image/webp', width: 8, height: 8,
      content: new Uint8Array(await sharp({ create: { width: 8, height: 8, channels: 3, background: label === 'A' ? '#8b4545' : '#458b45' } }).webp().toBuffer()) } },
  } });
  const a = await makeCongress('A'), b = await makeCongress('B');
  await request('/api/admin/login', { method: 'POST', body: { email: user.email, password } });
  await select(a.id);
  const siteA = await site(), settingsA = await settings();
  assert.equal(siteA.id, a.id); assert.equal(settingsA.id, a.id);
  // The same cookie jar models a second tab selecting another congress.
  await select(b.id);
  const siteB = await site(), settingsB = await settings();
  assert.equal(siteA.siteVersion, siteB.siteVersion); assert.equal(siteA.configVersion, siteB.configVersion);
  assert.equal(settingsA.configVersion, settingsB.configVersion);
  const beforeA = await saved(a.id), beforeB = await saved(b.id);
  const siteBody = { congressId: a.id, siteVersion: siteA.siteVersion, configVersion: siteA.configVersion, site: siteA.site, appearance: siteA.appearance };
  siteBody.site.heroCaption = { tr: 'Yanlış kongreye yazılmamalı', en: 'Must not overwrite another congress' };
  await patchSite(siteBody, 409);
  await patchSite(withoutId(siteBody), 409);
  pass('Equal site/configuration versions cannot redirect an old tab or ID-less site write to the newly selected congress');

  const settingsBody = { congressId: a.id, configVersion: settingsA.configVersion, settings: { ...settingsA.settings, name: 'Must not overwrite congress B' } };
  await patchSettings(settingsBody, 409);
  await patchSettings(withoutId(settingsBody), 409);
  pass('Equal configuration versions cannot redirect an old tab or ID-less congress settings write');

  const replacement = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#336699' } }).png().toBuffer();
  await upload(a.id, siteA.siteVersion, replacement, 409);
  await upload(undefined, siteA.siteVersion, replacement, 409);
  await visibility({ congressId: a.id, siteVersion: siteA.siteVersion, active: false }, 409);
  await visibility({ siteVersion: siteA.siteVersion, active: false }, 409);
  pass('An old tab and legacy clients cannot replace or hide another congress image at an equal site version');
  assert.deepEqual(await saved(a.id), beforeA); assert.deepEqual(await saved(b.id), beforeB);
  assert.equal(await db.auditLog.count({ where: { congressId: { in: [a.id, b.id] }, action: { in: ['site.settings.update', 'congress.configuration.update', 'site.asset.replace', 'site.asset.hide'] } } }), 0);
  pass('Rejected requests leave both congress records, modules, images, versions and mutation audit history unchanged');

  const currentSite = await site();
  await patchSite({ ...siteBody, congressId: b.id, siteVersion: currentSite.siteVersion, configVersion: currentSite.configVersion });
  const updatedSite = await site();
  assert.equal(updatedSite.id, b.id); assert.equal(updatedSite.site.heroCaption.en, siteBody.site.heroCaption.en);
  assert.equal(updatedSite.siteVersion, currentSite.siteVersion + 1);
  pass('A freshly loaded form with the matching congress ID can save site text');

  const currentSettings = await settings();
  await patchSettings({ congressId: b.id, configVersion: currentSettings.configVersion, settings: { ...currentSettings.settings, name: `Updated B ${suffix}` } });
  const updatedSettings = await settings();
  assert.equal(updatedSettings.settings.name, `Updated B ${suffix}`); assert.equal(updatedSettings.configVersion, currentSettings.configVersion + 1);
  pass('A freshly loaded form with the matching congress ID can save congress settings');

  const beforeUpload = await site();
  await upload(b.id, beforeUpload.siteVersion, replacement);
  const afterUpload = await site();
  assert.equal(afterUpload.siteVersion, beforeUpload.siteVersion + 1);
  assert.equal(afterUpload.assets[0].originalName, 'synthetic-logo.png');
  await visibility({ congressId: b.id, siteVersion: afterUpload.siteVersion, active: false });
  const hidden = await site();
  assert.equal(hidden.assets[0].active, false); assert.equal(hidden.siteVersion, afterUpload.siteVersion + 1);
  assert.deepEqual(await saved(a.id), beforeA);
  pass('Matching congress image replacement and visibility changes succeed while the other congress remains byte-for-byte unchanged');

  writeFileSync('.local/congress-context-result.json', JSON.stringify({ executedAt: new Date().toISOString(), checks, fixtures: { a: a.id, b: b.id }, realEmailsSent: 0 }, null, 2) + '\n', { mode: 0o600 });
  console.log(`Congress context checks passed: ${checks.length} scenarios.`);
} finally {
  if (jar.size) await request('/api/admin/logout', { method: 'POST', body: {} }).catch(() => {});
  await db.$disconnect();
}
