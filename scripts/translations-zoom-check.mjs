import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url).pathname;
const base = 'http://kongre-test.localhost:3102';
assert.equal(JSON.parse(readFileSync(root + '.local/isolated-acceptance/synthetic-only.json', 'utf8')).syntheticOnly, true);
const accounts = JSON.parse(readFileSync(root + '.local/isolated-acceptance/app/.local/p03-accounts.json', 'utf8'));
const out = '/private/tmp/kongre-translations-browser';
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'kongre-real-zoom-'));
const result = { method: 'Fresh persistent headless Chrome profile; chrome://settings/appearance #zoomLevel set to 200% through native settings UI', executedAt: new Date().toISOString() };
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: true, viewport: null,
    args: ['--window-size=1440,1000'],
  });
  result.browser = context.browser()?.version();
  const page = context.pages()[0];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  assert.equal((await context.request.post(base + '/api/admin/login', { data: accounts.organizerA ?? accounts.organizer })).status(), 200);
  await page.goto(base + '/admin/diller');
  await page.getByRole('heading', { name: 'Dil ve çeviriler', exact: true }).waitFor();
  await page.getByLabel('Çevrilecek içerik').selectOption('site');
  await page.getByLabel(/^Ana görsel alt bandı \(EN\)/).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const cdp = await context.newCDPSession(page);
  // Browser zoom changes CSS-to-DIP ratio. Capture the native surface directly;
  // Playwright's CSS-sized clip would otherwise crop the 200% image in half.
  const capture = async (name, fullPage = false) => {
    const options = { format: 'png', fromSurface: true, captureBeyondViewport: fullPage };
    if (fullPage) {
      const layout = await cdp.send('Page.getLayoutMetrics');
      options.clip = { ...layout.contentSize, scale: 1 };
    }
    const screenshot = await cdp.send('Page.captureScreenshot', options);
    writeFileSync(out + '/' + name + '.png', Buffer.from(screenshot.data, 'base64'));
  };
  const metrics = async () => ({
    ...await page.evaluate(() => ({
      innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      cssZoom: getComputedStyle(document.documentElement).zoom,
      visualViewportScale: visualViewport?.scale,
      media720: matchMedia('(max-width: 720px)').matches,
      formControls: [...document.querySelectorAll('main input,main textarea,main select,main button')]
        .filter(element => element.getClientRects().length)
        .map(element => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, label: element.labels?.[0]?.textContent?.trim() ?? element.textContent?.trim(), left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        }),
    })),
    cdp: await cdp.send('Page.getLayoutMetrics'),
  });
  result.baseline = await metrics();
  await capture('browser-zoom-100');
  const settings = await context.newPage();
  await settings.goto('chrome://settings/appearance');
  const zoom = settings.locator('#zoomLevel');
  await zoom.selectOption('2');
  result.browserZoomSetting = await zoom.evaluate(element => ({ value: element.value, label: element.selectedOptions[0].textContent.trim() }));
  await page.bringToFront();
  await page.waitForFunction(baseline => Math.abs(devicePixelRatio / baseline - 2) < 0.01 && innerWidth <= 721, result.baseline.devicePixelRatio);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  result.zoom200 = await metrics();
  assert.equal(result.browserZoomSetting.value, '2');
  assert.equal(result.zoom200.cssZoom, '1');
  assert.equal(result.zoom200.visualViewportScale, 1);
  assert.equal(result.zoom200.cdp.cssVisualViewport.zoom, 2);
  assert.equal(result.zoom200.devicePixelRatio / result.baseline.devicePixelRatio, 2);
  assert.equal(result.baseline.innerWidth / result.zoom200.innerWidth, 2);
  assert.equal(result.zoom200.outerWidth, result.baseline.outerWidth);
  assert.equal(result.zoom200.media720, true);
  assert.ok(result.zoom200.scrollWidth <= result.zoom200.innerWidth + 1);
  assert.ok(result.zoom200.bodyScrollWidth <= result.zoom200.innerWidth + 1);
  assert.ok(result.zoom200.formControls.length > 0);
  assert.deepEqual(result.zoom200.formControls.filter(control => control.left < -1 || control.right > result.zoom200.innerWidth + 1 || control.width <= 0 || control.height <= 0), []);
  await capture('browser-zoom-200');
  await capture('browser-zoom-200-full', true);
  await page.getByRole('button', { name: 'Metinleri kaydet', exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture('browser-zoom-200-save');
  assert.deepEqual(errors, []);
  result.passed = true;
  result.applicationWrites = 'No form saved; browser API mutations blocked. Synthetic login and logout only.';
  writeFileSync(out + '/browser-zoom-200-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: true, zoomSetting: result.browserZoomSetting, baselineWidth: result.baseline.innerWidth, zoomWidth: result.zoom200.innerWidth, cdpZoom: result.zoom200.cdp.cssVisualViewport.zoom, cssZoom: result.zoom200.cssZoom, horizontalOverflow: result.zoom200.scrollWidth - result.zoom200.innerWidth, output: out }));
} catch (error) {
  result.passed = false;
  result.error = String(error.message).split('\n')[0];
  writeFileSync(out + '/browser-zoom-200-result.json', JSON.stringify(result, null, 2));
  console.error(result.error);
  process.exitCode = 1;
} finally {
  await context?.request.post(base + '/api/admin/logout').catch(() => {});
  await context?.close();
  rmSync(profile, { recursive: true, force: true });
}
