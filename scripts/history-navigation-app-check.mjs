// Runs only against the separately provisioned local acceptance app. Never saves a form.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.TEST_BASE_URL??'http://kongre-test.localhost:3102';
const url=new URL(base);assert(url.hostname.endsWith('.localhost')&&url.port==='3102','Use the isolated acceptance application.');
const accounts=JSON.parse(await readFile(new URL('../.local/isolated-acceptance/app/.local/p03-accounts.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL??'chrome'});
const checks=[];
try{
 for(const fallback of [false,true]){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});let page;
  try{
   const login=await context.request.post(base+'/api/admin/login',{data:accounts.organizerA??accounts.organizer});assert.equal(login.status(),200,'Synthetic organizer login');
   page=await context.newPage();page.setDefaultTimeout(15000);
   await page.addInitScript(()=>{window.historyTestEvents=[];window.navigation?.addEventListener('navigate',event=>{window.historyTestEvents.push({type:event.navigationType,path:new URL(event.destination.url).pathname,sameDocument:event.destination.sameDocument,canIntercept:event.canIntercept,cancelable:event.cancelable});});});
   await page.route('**/api/**',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
   if(fallback)await page.addInitScript(()=>{window.NavigationPrecommitController=undefined;});
   await page.goto(base+'/admin/panel');
   async function link(path){
    const item=page.locator('a[href="'+path+'"]').first();
    await item.evaluate(element=>{for(let p=element.parentElement;p;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true;});
    await item.click();await page.waitForURL('**'+path);
   }
   await link('/admin/kongre-ayarlari');
   const name=()=>page.getByLabel('Kongre adı *',{exact:true});
   await name().waitFor();const original=await name().inputValue();
   await link('/admin/ekip');await page.getByRole('heading',{name:'Ekip ve roller',exact:true}).waitFor();
   await page.goBack();await page.waitForURL('**/admin/kongre-ayarlari');await name().waitFor();
   const draft='Kaydedilmeyen geçmiş testi '+(fallback?'fallback':'precommit');await name().fill(draft);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const state=await page.evaluate(()=>history.state),length=await page.evaluate(()=>history.length);
   const dialog=()=>page.getByRole('dialog',{name:'Kaydedilmemiş değişiklikler var'});
   const cancel=()=>dialog().getByRole('button',{name:'Düzenlemeye dön',exact:true}).click();
   const approve=()=>dialog().getByRole('button',{name:'Değişiklikleri bırak ve geç',exact:true}).click();
   for(let repeat=0;repeat<2;repeat++){
    void page.goBack().catch(()=>{});await dialog().waitFor();
    assert.equal(new URL(page.url()).pathname,'/admin/kongre-ayarlari');await cancel();
    assert.equal(await name().inputValue(),draft);assert.deepEqual(await page.evaluate(()=>history.state),state);
   }
   void page.goBack().catch(()=>{});await dialog().waitFor();await approve();await page.waitForURL('**/admin/panel');
   await page.getByRole('heading',{name:'Genel bakış',exact:true}).waitFor();
   await page.goForward();await page.waitForURL('**/admin/kongre-ayarlari');await name().waitFor();
   assert.equal(await name().inputValue(),original,'Approved departure must discard, not save, the draft');
   await name().fill(draft+' ileri');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   void page.goForward().catch(()=>{});await dialog().waitFor();
   assert.equal(new URL(page.url()).pathname,'/admin/kongre-ayarlari');await cancel();assert.equal(await name().inputValue(),draft+' ileri');
   void page.goForward().catch(()=>{});await dialog().waitFor();await approve();await page.waitForURL('**/admin/ekip');
   await page.getByRole('heading',{name:'Ekip ve roller',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>history.length),length,'No extra history entries');
   assert.equal(await page.evaluate(()=>history.state.__NA),true);assert.ok(await page.evaluate(()=>history.state.__PRIVATE_NEXTJS_INTERNALS_TREE));
   checks.push(`Real App Router back/forward cancel+approve, draft and Next state retained (${fallback?'restore fallback':'precommit'})`);
  }catch(error){if(page)console.error('History test diagnostic',await page.evaluate(()=>({path:location.pathname,events:window.historyTestEvents,dialogs:[...document.querySelectorAll('dialog')].map(dialog=>({open:dialog.open,label:dialog.getAttribute('aria-labelledby')})),entries:window.navigation?.entries().map(entry=>new URL(entry.url).pathname)})));throw error;}finally{await context.request.post(base+'/api/admin/logout').catch(()=>{});await context.close();}
 }
 for(const check of checks)console.log('PASS '+check);
}catch(error){console.error(String(error.message??error).split('\n')[0]);process.exitCode=1;}finally{await browser.close();}
