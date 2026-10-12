import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const root=new URL('../',import.meta.url).pathname,isolated=root+'.local/isolated-acceptance/app/';
assert.equal(JSON.parse(readFileSync(root+'.local/isolated-acceptance/synthetic-only.json','utf8')).syntheticOnly,true);
const accounts=JSON.parse(readFileSync(isolated+'.local/p03-accounts.json','utf8')),fixture=JSON.parse(readFileSync(isolated+'.local/translations-check-result.json','utf8'));
const out='/private/tmp/kongre-translations-browser';mkdirSync(out,{recursive:true});const checks=[],errors=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const base='http://kongre-test.localhost:3102', caption='Green transformation\nTogether for the future '+Date.now();
try{
 assert.equal((await context.request.post(base+'/api/admin/login',{data:accounts.organizer})).status(),200);
 assert.equal((await context.request.post(base+'/api/platform/context',{data:{congressId:fixture.congressId}})).status(),200);
 await page.goto(base+'/admin/diller');await page.getByRole('heading',{name:'Dil ve çeviriler',exact:true}).waitFor();
 await page.getByLabel('Çevrilecek içerik').selectOption('site');await page.getByLabel(/^Ana görsel alt bandı \(EN\)/).waitFor();
 assert.equal(await page.getByLabel(/^Ana görsel alt bandı \(EN\)/).evaluate(e=>e.tagName),'TEXTAREA');
 await page.getByLabel(/^Ana görsel alt bandı \(EN\)/).fill(caption);
 const request=page.waitForResponse(r=>r.url().endsWith('/api/platform/site')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Metinleri kaydet',exact:true}).click();assert.equal((await request).status(),200);await page.getByRole('status').filter({hasText:'Metinler kaydedildi'}).waitFor();checks.push('Home bilingual fields save multiline content through the real form');
 await page.getByLabel(/^Ana başlık \(EN\)/).fill('Unsaved English draft');await page.getByLabel('Çevrilecek içerik').selectOption('page:'+fixture.pageId);await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Düzenlemeye dön',exact:true}).click();assert.equal(await page.getByLabel(/^Ana başlık \(EN\)/).inputValue(),'Unsaved English draft');checks.push('Changing translation record can be cancelled without losing edits');
 await page.getByLabel('Çevrilecek içerik').selectOption('page:'+fixture.pageId);await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Değişiklikleri bırak ve geç',exact:true}).click();await page.getByLabel(/^Halka açık başlık \(EN\)/).waitFor();await page.getByLabel(/^Halka açık başlık \(EN\)/).fill('English browser acceptance '+Date.now());
 const saved=page.waitForResponse(r=>r.url().endsWith('/cms/pages/'+fixture.pageId)&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Çeviri taslağını kaydet',exact:true}).click();assert.equal((await saved).status(),200);await page.getByRole('status').filter({hasText:'Çeviri taslağı kaydedildi'}).waitFor();
 const published=page.waitForResponse(r=>r.url().endsWith('/publication')&&r.request().method()==='POST');await page.getByRole('button',{name:'Kaydedilmiş çeviriyi yayımla',exact:true}).click();assert.equal((await published).status(),200);checks.push('CMS English draft saves and publishes in the same central screen');
 await page.getByLabel('Çevrilecek içerik').selectOption('site');await page.getByLabel(/^Ana görsel alt bandı \(EN\)/).waitFor();assert.equal(await page.getByLabel(/^Ana görsel alt bandı \(EN\)/).inputValue(),caption);
 for(const [name,width,zoom] of [['desktop',1440,1],['tablet',850,1],['mobile',390,1],['zoom-200',1440,2]]){await page.setViewportSize({width,height:1000});await page.evaluate(value=>{document.documentElement.style.zoom=String(value);},zoom);await page.screenshot({path:out+'/'+name+'.png',fullPage:false});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),name+' has no horizontal overflow');checks.push(name+' translation layout stays within viewport');}
 await page.evaluate(()=>{document.documentElement.style.zoom='1';});await page.setViewportSize({width:1440,height:1000});
 const account=page.getByRole('button').filter({hasText:'Hesap bilgileri'});await account.click();await page.getByRole('dialog',{name:'Hesap bilgileri',exact:true}).waitFor();await page.screenshot({path:out+'/account.png'});checks.push('Account dialog exposes role, account and avatar information');await page.keyboard.press('Escape');
 await context.addCookies([{name:'locale',value:'en',url:base}]);await page.goto(base+'/'+fixture.slug);await page.locator('.site-visual-caption').waitFor();assert.ok((await page.locator('.site-visual-caption').innerText()).includes('Together for the future'));assert.equal(await page.locator('.site-institution').evaluate(e=>getComputedStyle(e).backgroundColor),await page.locator('.site-visual-caption').evaluate(e=>getComputedStyle(e).backgroundColor));assert.ok(await page.locator('link[rel="icon"]').count()>0);await page.screenshot({path:out+'/public-en.png'});checks.push('Public English caption, theme bands and favicon render');
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({checks,errors,executedAt:new Date().toISOString()},null,2));console.log(`Translations browser acceptance passed: ${checks.length} checks`);
}catch(error){await page.screenshot({path:out+'/failure.png',fullPage:false});writeFileSync(out+'/failure.txt',await page.locator('body').innerText());throw error;}finally{await context.close();await browser.close();}
