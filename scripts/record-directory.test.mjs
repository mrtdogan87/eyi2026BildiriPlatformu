// Offline React/browser regression: no application server, credentials or database.
// Use an installed Playwright, or set NODE_PATH to the provided browser-tool packages.
import test, {after, before} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),{chromium}=require('playwright'),{webpack}=require('next/dist/compiled/webpack/webpack');
const repo=fileURLToPath(new URL('..',import.meta.url));
let directory,browser,bundle;
before(async()=>{
 directory=await mkdtemp(path.join(tmpdir(),'record-directory-test-'));
 await writeFile(path.join(directory,'loader.cjs'),`const ts=require(${JSON.stringify(require.resolve('typescript'))}); module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;};`);
 await writeFile(path.join(directory,'navigation.js'),`export const useRouter=()=>({refresh(){},push(){}});export const usePathname=()=>'/admin/test';`);
 await writeFile(path.join(directory,'fixture.tsx'),`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {RecordDirectory} from '@/components/admin-ui/record-directory';
import {AdminNavigationGuard} from '@/components/admin-ui/navigation-guard';
import {AccessEditor,OrganizationForm} from '@/components/platform-management/controls';
import {StartIntervention} from '@/components/platform-management/intervention';
import {historyCaptureBootstrap} from '@/components/admin-ui/history-navigation';
const users=[{id:'a',name:'A kişisi',roles:['SECRETARY']},{id:'b',name:'B kişisi',roles:['PARTICIPANT']}];
const root=createRoot(document.getElementById('root'));
const capture=document.createElement('script');capture.textContent=historyCaptureBootstrap;document.head.append(capture);
window.routerPops=[];
window.addEventListener('popstate',()=>{window.routerPops.push(location.pathname);history.replaceState(history.state,'',location.href);});
window.requests=[];
window.fetch=async(url,options)=>{window.requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({accessNotice:'Kaydedildi'})};};
window.renderFixture=(options={})=>{
 const {kind='roles',selected='a',reverse=false,scope='CONGRESS',congressId='congress-a',account=false}=options;
 const rows=(reverse?[...users].reverse():users).map(user=>({id:user.id,title:user.name,subtitle:user.id+'@example.invalid',detail:
  kind==='organizations'?<OrganizationForm initial={{id:user.id,name:user.name+' kurumu'}}/>:
  kind==='intervention'?<StartIntervention congress={{id:user.id,name:user.name+' kongresi'}} organization={{id:'org',name:'Kurum'}}/>:
  <AccessEditor scope="CONGRESS" userId={user.id} congressId="congress-a" initialRoles={user.roles} active/>
 }));
 const user=users.find(user=>user.id===selected);
 root.render(<AdminNavigationGuard scope="test"><>
  {kind==='direct'?<AccessEditor scope={scope} userId={user.id} congressId={congressId} initialRoles={user.roles} account={account} active/>:
  <RecordDirectory label="Kayıt" records={rows} initialSelected="a"/>}
  <a href="/admin/other">Başka sayfa</a>
 </></AdminNavigationGuard>);
 return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
};
window.renderFixture();
`);
 const compiler=webpack({mode:'development',devtool:false,entry:path.join(directory,'fixture.tsx'),output:{path:directory,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],modules:[path.join(repo,'node_modules')],alias:{'@':path.join(repo,'src'),'next/navigation':path.join(directory,'navigation.js')}},module:{rules:[{test:/\.tsx?$/,use:path.join(directory,'loader.cjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>{compiler.close(()=>{});if(error||stats.hasErrors())reject(error??new Error(stats.toString({all:false,errors:true})));else resolve();}));
 bundle=await readFile(path.join(directory,'bundle.js'),'utf8');
 browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL});
},{timeout:30000});
after(async()=>{await browser?.close();if(directory)await rm(directory,{recursive:true,force:true});});

async function pageFor(t,options){
 const page=await browser.newPage();t.after(()=>page.close());
 await page.route('http://localhost:19199/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="tr"><body><div id="root"></div></body></html>'}));
 await page.goto('http://localhost:19199/admin/test');await page.addScriptTag({content:bundle});
 await page.waitForFunction(()=>typeof window.renderFixture==='function');
 if(options)await page.evaluate(options=>window.renderFixture(options),options);
 await page.getByText('Başka sayfa',{exact:true}).waitFor();return page;
}
const detail=page=>page.getByRole('region',{name:'Kayıt detayı'});
const record=(page,id)=>page.locator('[data-record-id="'+id+'"]');
async function discard(page){await page.getByRole('button',{name:'Değişiklikleri bırak ve geç',exact:true}).click();}

test('member switch cancels or discards the old draft before saving only the new member roles',async t=>{
 const page=await pageFor(t);
 await detail(page).getByLabel('Hakem',{exact:true}).check();
 await record(page,'b').click();
 await page.getByRole('button',{name:'Düzenlemeye dön',exact:true}).click();
 assert.equal(await detail(page).getByRole('heading',{name:'A kişisi',exact:true}).count(),1);
 assert.equal(await detail(page).getByLabel('Hakem',{exact:true}).isChecked(),true);
 await record(page,'b').click();await discard(page);
 assert.equal(await detail(page).getByLabel('Katılımcı',{exact:true}).isChecked(),true);
 assert.equal(await detail(page).getByLabel('Sekreter',{exact:true}).isChecked(),false);
 assert.equal(await detail(page).getByLabel('Hakem',{exact:true}).isChecked(),false);
 await detail(page).getByRole('button',{name:'Görevleri kaydet',exact:true}).click();
 await page.waitForFunction(()=>window.requests.length===1);
 assert.deepEqual(await page.evaluate(()=>window.requests[0].body),{action:'UPDATE',scope:'CONGRESS',userId:'b',congressId:'congress-a',roles:['PARTICIPANT'],active:true});
 await record(page,'a').click();
 assert.equal(await page.locator('dialog[open]').count(),0);
 assert.equal(await detail(page).getByLabel('Hakem',{exact:true}).isChecked(),false);
});

test('record reordering and same-record refresh retain selection and its unsaved draft',async t=>{
 const page=await pageFor(t);await record(page,'b').click();await detail(page).getByLabel('Hakem',{exact:true}).check();
 await page.evaluate(()=>window.renderFixture({reverse:true}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await record(page,'b').getAttribute('aria-pressed'),'true');
 assert.equal(await detail(page).getByLabel('Hakem',{exact:true}).isChecked(),true);
 await page.getByRole('link',{name:'Başka sayfa'}).click();
 assert.equal(await page.getByRole('dialog').isVisible(),true);
});

test('organization input is preserved on cancel and reset to the next record on discard',async t=>{
 const page=await pageFor(t,{kind:'organizations'});
 await detail(page).getByLabel('Kurum adı',{exact:true}).fill('A kurumu için taslak');
 await record(page,'b').click();await page.getByRole('button',{name:'Düzenlemeye dön',exact:true}).click();
 assert.equal(await detail(page).getByLabel('Kurum adı',{exact:true}).inputValue(),'A kurumu için taslak');
 await record(page,'b').click();await discard(page);
 assert.equal(await detail(page).getByLabel('Kurum adı',{exact:true}).inputValue(),'B kişisi kurumu');
 await detail(page).getByRole('button',{name:'Kurum adını kaydet',exact:true}).click();await page.waitForFunction(()=>window.requests.length===1);
 assert.deepEqual(await page.evaluate(()=>window.requests[0]),{url:'/api/platform/management/organizations/b',body:{name:'B kişisi kurumu'}});
});

test('intervention reason and dirty registration do not transfer to the next congress',async t=>{
 const page=await pageFor(t,{kind:'intervention'});
 await detail(page).getByLabel('Müdahale gerekçesi',{exact:true}).fill('A kongresinin teknik destek gerekçesi');
 await record(page,'b').click();await discard(page);
 assert.equal(await detail(page).getByLabel('Müdahale gerekçesi',{exact:true}).inputValue(),'');
 await record(page,'a').click();assert.equal(await page.locator('dialog[open]').count(),0);
 assert.equal(await detail(page).getByLabel('Müdahale gerekçesi',{exact:true}).inputValue(),'');
});

test('standalone access editors reset drafts across user and congress identities',async t=>{
 const page=await pageFor(t,{kind:'direct'});
 await page.getByLabel('Hakem',{exact:true}).check();
 await page.evaluate(()=>window.renderFixture({kind:'direct',selected:'b'}));
 assert.equal(await page.getByLabel('Katılımcı',{exact:true}).isChecked(),true);
 assert.equal(await page.getByLabel('Hakem',{exact:true}).isChecked(),false);
 await page.getByLabel('Hakem',{exact:true}).check();
 await page.evaluate(()=>window.renderFixture({kind:'direct',selected:'b',congressId:'congress-b'}));
 assert.equal(await page.getByLabel('Hakem',{exact:true}).isChecked(),false);
});

test('platform confirmation is scoped to the selected person and operation',async t=>{
 const page=await pageFor(t,{kind:'direct',scope:'PLATFORM'});
 await page.getByLabel('Platform kapsamındaki işlemi onaylıyorum.',{exact:true}).check();
 await page.evaluate(()=>window.renderFixture({kind:'direct',scope:'PLATFORM',selected:'b'}));
 assert.equal(await page.getByLabel('Platform kapsamındaki işlemi onaylıyorum.',{exact:true}).isChecked(),false);
 await page.getByLabel('Platform kapsamındaki işlemi onaylıyorum.',{exact:true}).check();
 await page.evaluate(()=>window.renderFixture({kind:'direct',scope:'PLATFORM',selected:'b',account:true}));
 assert.equal(await page.getByLabel('Platform kapsamındaki işlemi onaylıyorum.',{exact:true}).isChecked(),false);
});

for(const fallback of [false,true])test(`browser back/forward retains draft and native history state (${fallback?'restore fallback':'precommit'})`,async t=>{
 const page=await pageFor(t,{kind:'organizations'});
 await page.evaluate(fallback=>{
  if(fallback)window.NavigationPrecommitController=undefined;
  history.replaceState({__NA:true,__PRIVATE_NEXTJS_INTERNALS_TREE:{test:'previous'}},'', '/admin/previous');
  history.pushState({__NA:true,__PRIVATE_NEXTJS_INTERNALS_TREE:{test:'edit'}},'', '/admin/edit');
  window.originalHistoryState=structuredClone(history.state);
 },fallback);
 await detail(page).getByLabel('Kurum adı',{exact:true}).fill('Geri ileri korunacak taslak');
 for(let attempt=0;attempt<2;attempt++){
  void page.goBack().catch(()=>{});
  await page.getByRole('dialog').waitFor();
  assert.equal(new URL(page.url()).pathname,'/admin/edit');
  await page.getByRole('button',{name:'Düzenlemeye dön',exact:true}).click();
  assert.equal(await detail(page).getByLabel('Kurum adı',{exact:true}).inputValue(),'Geri ileri korunacak taslak');
  assert.deepEqual(await page.evaluate(()=>window.routerPops),[],'Cancelled traversal must not reach the router');
  assert.deepEqual(await page.evaluate(()=>history.state),await page.evaluate(()=>window.originalHistoryState));
 }
 void page.goBack().catch(()=>{});await page.getByRole('dialog').waitFor();await discard(page);
 await page.waitForURL('**/admin/previous');
 assert.deepEqual(await page.evaluate(()=>history.state),{__NA:true,__PRIVATE_NEXTJS_INTERNALS_TREE:{test:'previous'}});
 void page.goForward().catch(()=>{});await page.getByRole('dialog').waitFor();
 assert.equal(new URL(page.url()).pathname,'/admin/previous');
 await page.getByRole('button',{name:'Düzenlemeye dön',exact:true}).click();
 assert.equal(await detail(page).getByLabel('Kurum adı',{exact:true}).inputValue(),'Geri ileri korunacak taslak');
 void page.goForward().catch(()=>{});await page.getByRole('dialog').waitFor();await discard(page);
 await page.waitForURL('**/admin/edit');
 assert.deepEqual(await page.evaluate(()=>history.state),await page.evaluate(()=>window.originalHistoryState));
});
