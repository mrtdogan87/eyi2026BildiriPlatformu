import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {loadEnv} from './load-env.mjs';
import {assertLocal} from './environment.mjs';
import {hashToken} from '../src/platform/password.mjs';
import {profileConfiguration} from '../src/modules/congress/configuration.ts';
import {emptyDocument} from '../src/modules/cms/configuration.ts';
import {emptyRecord} from '../src/modules/content/configuration.ts';

loadEnv();assertLocal();
if(process.env.ISOLATED_LOCAL_TEST!=='synthetic-only')throw Error('Isolated synthetic environment required');
const db=new PrismaClient(),suffix=randomUUID().slice(0,8),checks=[],userIds=[],congressIds=[];
let organizationId;
const pass=label=>{checks.push(label);console.log('PASS '+label);};
async function request(path,{actor,method='GET',body,status=200,raw=false}={}){
 const response=await fetch(process.env.APP_BASE_URL+path,{method,headers:{...(actor?{cookie:`${process.env.SESSION_COOKIE_NAMESPACE}_platform_session=${actor.token}`}:{}) ,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const data=raw?await response.text():await response.json();
 assert.equal(response.status,status,`${method} ${path}: ${typeof data==='object'?data.error??response.status:response.status}`);
 return data;
}
try{
 await request('/api/platform/translations',{status:401});
 const organization=await db.organization.create({data:{name:`Translations access ${suffix} (synthetic)`}});organizationId=organization.id;
 const configuration=profileConfiguration('REGISTRATION_ONLY');
 const makeCongress=async label=>{
  const congress=await db.congress.create({data:{organizationId,name:`Translations ${label} ${suffix}`,slug:`translations-access-${label.toLowerCase()}-${suffix}`,year:2026,configuration,modules:{create:{key:'CMS',enabled:false}}}});congressIds.push(congress.id);
  const page=await db.cmsPage.create({data:{congressId:congress.id,slug:'translation-page',internalName:`Page ${label}`,draft:emptyDocument()}});
  const record=await db.siteRecord.create({data:{congressId:congress.id,kind:'ANNOUNCEMENT',internalName:`Record ${label}`,draft:emptyRecord('ANNOUNCEMENT')}});
  return {congress,page,record};
 };
 const a=await makeCongress('A'),b=await makeCongress('B');
 await db.cmsPage.create({data:{congressId:a.congress.id,slug:'archived-translation-page',internalName:'Archived page',archived:true,draft:emptyDocument()}});
 await db.siteRecord.create({data:{congressId:a.congress.id,kind:'ANNOUNCEMENT',internalName:'Archived record',archived:true,draft:emptyRecord('ANNOUNCEMENT')}});
 const actor=async role=>{
  const user=await db.platformUser.create({data:{email:`translation-${role.toLowerCase()}-${suffix}@example.invalid`,name:`Synthetic ${role}`,organizations:{create:{organizationId}},congresses:{create:{congressId:a.congress.id,role}}}});userIds.push(user.id);
  const token=randomBytes(32).toString('hex');await db.platformSession.create({data:{userId:user.id,congressId:a.congress.id,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+3600000)}});
  return {id:user.id,token};
 };
 const organizer=await actor('ORGANIZER'),editor=await actor('CONTENT_EDITOR'),secretary=await actor('SECRETARY');
 const overview=who=>request('/api/platform/translations',{actor:who});
 const off=await overview(organizer);assert.equal(off.congressId,a.congress.id);assert.equal(off.canSettings,true);assert.deepEqual(off.entries.map(e=>e.kind),['site','settings']);
 const html=await request('/admin/diller',{actor:organizer,raw:true});assert.ok(html.includes('<h1>Dil ve çeviriler</h1>'));assert.ok(html.includes('href="/admin/diller"'));assert.ok(!html.includes('href="/admin/cms"'));
 pass('CMS-disabled organizer sees the translation page and navigation with only site/settings inventory');

 const site=await request('/api/platform/site',{actor:organizer});const originalTr=site.site.heroCaption.tr;site.site.heroCaption.en='Synthetic English caption';
 await request('/api/platform/site',{actor:organizer,method:'PATCH',body:{congressId:site.id,siteVersion:site.siteVersion,configVersion:site.configVersion,site:site.site,appearance:site.appearance}});
 const savedSite=await request('/api/platform/site',{actor:organizer});assert.equal(savedSite.site.heroCaption.en,'Synthetic English caption');assert.equal(savedSite.site.heroCaption.tr,originalTr);
 const settings=await request('/api/platform/congresses/settings',{actor:organizer});settings.settings.configuration.invitationFacts.theme.en='Synthetic theme';
 await request('/api/platform/congresses/settings',{actor:organizer,method:'PATCH',body:{congressId:settings.id,configVersion:settings.configVersion,settings:settings.settings}});
 assert.equal((await request('/api/platform/congresses/settings',{actor:organizer})).settings.configuration.invitationFacts.theme.en,'Synthetic theme');
 pass('Site and settings translations save with CMS disabled and preserve existing Turkish text');

 for(const path of [`/api/platform/cms/pages/${a.page.id}`,`/api/platform/content/${a.record.id}`]){
  await request(path,{actor:organizer,status:403});
  await request(path,{actor:organizer,method:'PATCH',body:{},status:403});
  await request(path+'/publication',{actor:organizer,method:'POST',body:{version:1,action:'PUBLISH'},status:403});
 }
 await request('/api/platform/translations',{actor:editor,status:403});await request('/api/platform/translations',{actor:secretary,status:403});
 pass('CMS-disabled reads, saves and publishing remain blocked; CMS-only and unrelated roles cannot open the translation API');

 await db.congressModule.update({where:{congressId_key:{congressId:a.congress.id,key:'CMS'}},data:{enabled:true}});
 const organizerOn=await overview(organizer);assert.deepEqual(organizerOn.entries.map(e=>e.kind),['site','settings','page','record']);
 const editorOn=await overview(editor);assert.equal(editorOn.canSettings,false);assert.deepEqual(editorOn.entries.map(e=>[e.kind,e.id]),[['page',a.page.id],['record',a.record.id]]);
 await request('/api/platform/site',{actor:editor,status:403});await request('/api/platform/congresses/settings',{actor:editor,status:403});await request('/api/platform/translations',{actor:secretary,status:403});
 pass('CMS-enabled content editor receives only active CMS records; settings remain restricted and unrelated roles remain denied');

 for(const path of [`/api/platform/cms/pages/${b.page.id}`,`/api/platform/content/${b.record.id}`]){
  await request(path,{actor:editor,status:404});
  await request(path+'/publication',{actor:editor,method:'POST',body:{version:1,action:'PUBLISH'},status:404});
 }
 assert.ok(!JSON.stringify(editorOn).includes(b.page.id));assert.ok(!JSON.stringify(editorOn).includes(b.record.id));
 assert.equal((await db.cmsPage.findUniqueOrThrow({where:{id:b.page.id}})).version,1);assert.equal((await db.siteRecord.findUniqueOrThrow({where:{id:b.record.id}})).version,1);
 pass('Translation inventory and publication reject records belonging to a different congress');

 await db.congress.update({where:{id:a.congress.id},data:{closedAt:new Date()}});
 assert.deepEqual((await overview(organizer)).entries.map(e=>e.kind),['site','settings']);await request('/api/platform/translations',{actor:editor,status:403});
 pass('Congress closure retains settings access and removes CMS translation access consistently');
 writeFileSync('.local/translations-access-result.json',JSON.stringify({executedAt:new Date().toISOString(),checks,realEmailsSent:0},null,2)+'\n',{mode:0o600});
 console.log(`Translation access checks passed: ${checks.length} scenarios.`);
}finally{
 if(organizationId){await db.auditLog.deleteMany({where:{OR:[{organizationId},{actorId:{in:userIds}},{congressId:{in:congressIds}}]}});await db.platformUser.deleteMany({where:{id:{in:userIds}}});await db.congress.deleteMany({where:{id:{in:congressIds}}});await db.organization.delete({where:{id:organizationId}});}
 await db.$disconnect();
}
