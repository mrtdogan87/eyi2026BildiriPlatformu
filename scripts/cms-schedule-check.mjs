import {contextRequestBody} from './intervention-test-requests.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import sharp from 'sharp';
import {loadEnv} from './load-env.mjs';
import {assertLocal} from './environment.mjs';
import {hashPassword} from '../src/platform/password.mjs';
import {profileConfiguration} from '../src/modules/congress/configuration.ts';
import {emptyDocument} from '../src/modules/cms/configuration.ts';
import {emptyRecord} from '../src/modules/content/configuration.ts';
import {processCmsSchedules} from '../src/modules/cms/schedule-worker.mjs';
loadEnv();assertLocal();
const db=new PrismaClient(),base=process.env.APP_BASE_URL,accounts=JSON.parse(readFileSync('.local/p03-accounts.json','utf8')),suffix=randomUUID().slice(0,8),admin=new Map(),editor=new Map(),secretary=new Map(),checks=[],ap='/api/platform/cms/pages';
const future=new Date(Date.now()+24*60*60*1000),afterDue=new Date(future.getTime()+1000),common={reason:'Local synthetic scheduled publication acceptance.',confirmed:true};
let demo,user,counter=0;
const ok=(value,label)=>{assert.ok(value,label);checks.push(label);};
async function req(path,{method='GET',body,jar=admin,status=200,headers={}}={}){
 const form=body instanceof FormData,r=await fetch(base+path,{method,redirect:'manual',headers:{cookie:[...jar].map(([k,v])=>k+'='+v).join(';'),...(!form&&body?{'content-type':'application/json'}:{}),...headers},body:body?(form?body:JSON.stringify(contextRequestBody(path,body))):undefined});
 assert.ok([].concat(status).includes(r.status),method+' '+path+': expected '+status+', received '+r.status);
 for(const c of r.headers.getSetCookie()){const[k,...v]=c.split(';')[0].split('=');if(v.join('='))jar.set(k,v.join('='));else jar.delete(k);}
 return r;
}
const json=async(path,options)=>(await req(path,options)).json(),post=(path,body,jar=admin,status=200)=>json(path,{method:'POST',body,jar,status}),get=(id,jar=admin)=>json(ap+'/'+id,{jar});
async function save(id,doc,jar=admin){const current=await get(id,jar);return json(ap+'/'+id,{method:'PATCH',jar,body:{version:current.page.version,internalName:current.page.internalName,document:doc}});}
function document(label){const d=emptyDocument();d.translations.tr={...d.translations.tr,title:label,blocks:[{id:'content',type:'paragraph',text:'Yerel sentetik içerik: '+label}]};d.translations.en={...d.translations.en,enabled:false,title:'PRIVATE English draft',blocks:[{id:'private',type:'paragraph',text:'PRIVATE English body'}]};return d;}
async function page(doc=document('Zamanlama '+(++counter))){const p=await post(ap,{slug:'zamanlama-'+(++counter),internalName:'Synthetic schedule '+counter},admin,201);await save(p.id,doc);return {id:p.id,doc};}
async function schedule(id,{jar=editor,dueAt=future.toISOString(),patch={},status=200}={}){const current=await get(id,jar),pending=current.schedules.find(s=>s.status==='PENDING');return post(ap+'/'+id+'/schedule',{...common,action:'SCHEDULE',version:current.page.version,expectedScheduleId:pending?.id??null,dueAt,...patch},jar,status);}
async function cancel(id,scheduleId,status=200){return post(ap+'/'+id+'/schedule',{...common,action:'CANCEL',version:(await get(id)).page.version,scheduleId},admin,status);}
async function publication(id,action='PUBLISH',revisionId){return post(ap+'/'+id+'/publication',{action,version:(await get(id)).page.version,...(revisionId?{revisionId}:{})});}
const row=id=>db.cmsPublicationSchedule.findUniqueOrThrow({where:{id}}),work=(client=db)=>processCmsSchedules({prisma:client,now:afterDue,congressId:demo.id});
async function blocked(scheduleId,label){await work();ok((await row(scheduleId)).status==='BLOCKED',label);}
const toggle=enabled=>json('/api/platform/modules',{method:'PATCH',body:{key:'CMS',enabled}});
try{
 const configuration=profileConfiguration('REGISTRATION_ONLY');configuration.modules.REGISTRATION=false;
 demo=await db.congress.create({data:{slug:'cms-schedule-'+suffix,name:'CMS zamanlama yerel denetimi '+suffix,organizationId:'local-org-a',configuration,modules:{create:{key:'CMS',enabled:true}}}});
 const credentials={email:'cms-schedule-'+suffix+'@example.invalid',password:'Local-schedule-'+randomUUID()};
 user=await db.platformUser.create({data:{email:credentials.email,name:'Synthetic schedule editor',passwordHash:hashPassword(credentials.password),organizations:{create:{organizationId:'local-org-a'}},congresses:{create:{congressId:demo.id,role:'CONTENT_EDITOR'}}}});
 const secretaryUser=await db.platformUser.findUniqueOrThrow({where:{email:accounts.secretary.email}});await db.congressMembership.create({data:{congressId:demo.id,userId:secretaryUser.id,role:'SECRETARY'}});
 for(const [jar,account] of [[admin,accounts.platform],[editor,credentials],[secretary,accounts.secretary]]){await post('/api/admin/login',account,jar);await post('/api/platform/context',{congressId:demo.id},jar);}
 const first=await page();await req(ap+'/'+first.id+'/schedule',{jar:new Map(),status:401});await req(ap+'/'+first.id+'/schedule',{jar:secretary,status:403});
 await schedule(first.id,{patch:{confirmed:false},status:400});await schedule(first.id,{dueAt:new Date(Date.now()-1000).toISOString(),status:400});await schedule(first.id,{patch:{sourceRevisionId:'foreign'},status:400});
 ok(await db.cmsPublicationSchedule.count({where:{congressId:demo.id}})===0,'Anonymous/unauthorized/unconfirmed/past/forged requests create no schedule');
 const scheduled=await schedule(first.id),stored=await row(scheduled.id),source=await db.cmsRevision.findUniqueOrThrow({where:{id:stored.sourceRevisionId}});
 ok(stored.actorId===user.id&&stored.sourceVersion===source.number&&source.pageId===first.id&&stored.dueAt.toISOString()===future.toISOString(),'Schedule pins the exact saved revision, actor and approved UTC time');
 await processCmsSchedules({prisma:db,now:new Date(),congressId:demo.id});ok((await row(scheduled.id)).status==='PENDING'&&!(await get(first.id)).page.publishedRevisionId,'Worker does not publish before the approved time');
 await cancel(first.id,scheduled.id);await work();ok((await row(scheduled.id)).status==='CANCELLED'&&!(await get(first.id)).page.publishedRevisionId,'Explicit cancellation prevents later execution');
 const before=await schedule(first.id),later=new Date(future.getTime()+5000),rescheduled=await schedule(first.id,{dueAt:later.toISOString()});await cancel(first.id,before.id,409);
 ok((await row(before.id)).status==='CANCELLED'&&(await row(rescheduled.id)).status==='PENDING','Rescheduling preserves the cancelled approval and creates one new durable pending approval');await cancel(first.id,rescheduled.id);
 const current=await get(first.id),raceBody={...common,action:'SCHEDULE',version:current.page.version,expectedScheduleId:null,dueAt:future.toISOString()};
 const race=await Promise.all([req(ap+'/'+first.id+'/schedule',{method:'POST',body:raceBody,jar:editor,status:[200,409]}),req(ap+'/'+first.id+'/schedule',{method:'POST',body:raceBody,jar:editor,status:[200,409]})]);
 ok(race.map(r=>r.status).sort().join(',')==='200,409','Concurrent scheduling has one winner and one explicit conflict');
 const pending=(await get(first.id)).schedules.find(s=>s.status==='PENDING'),restarted=new PrismaClient();
 try{await Promise.all([work(db),work(restarted)]);await work(restarted);}finally{await restarted.$disconnect();}
 const result=await row(pending.id),publishedPage=await get(first.id);
 ok(result.status==='PUBLISHED'&&result.publishedRevisionId===publishedPage.page.publishedRevisionId&&await db.auditLog.count({where:{targetId:pending.id,action:'cms.schedule.published'}})===1,'Fresh and concurrent workers publish exactly once with one audit; reprocessing is idempotent');
 const publicPath='/'+demo.slug+'/sayfalar/'+publishedPage.page.slug;
 const html=await(await req(publicPath+'?lang=tr',{jar:new Map()})).text();await req(publicPath+'?lang=en',{jar:new Map(),status:404});
 ok(html.includes('Yerel sentetik içerik')&&!html.includes('PRIVATE English body'),'Scheduled Turkish publication keeps disabled English drafts private');
 const outdated=await schedule(first.id),newDoc=document('Yeni kaydedilmiş taslak');await save(first.id,newDoc);await work();
 ok((await row(outdated.id)).status==='BLOCKED'&&(await get(first.id)).page.publishedRevisionId===result.publishedRevisionId,'Saving a new draft invalidates the schedule and preserves the previously published revision');
 for(const action of ['WITHDRAW','RESTORE','RENAME','ARCHIVE']){
  const p=await page(),s=await schedule(p.id),state=await get(p.id);
  if(action==='WITHDRAW')await publication(p.id,'WITHDRAW');
  if(action==='RESTORE')await publication(p.id,'RESTORE',state.history.items[state.history.items.length-1].id);
  if(action==='RENAME'||action==='ARCHIVE')await post(ap+'/'+p.id+'/manage',{version:state.page.version,action,...(action==='RENAME'?{slug:'renamed-'+(++counter)}:{})});
  await work();ok((await row(s.id)).status==='BLOCKED','Pending schedule is invalidated by '+action);
 }
 const revoke=await page(),revokeSchedule=await schedule(revoke.id);await db.congressMembership.update({where:{congressId_userId:{congressId:demo.id,userId:user.id}},data:{active:false}});await blocked(revokeSchedule.id,'Revoked congress membership blocks a previously authorized schedule');await db.congressMembership.update({where:{congressId_userId:{congressId:demo.id,userId:user.id}},data:{active:true}});await work();ok((await row(revokeSchedule.id)).status==='BLOCKED','Restoring membership never silently retries a blocked approval');
 const concurrentRevoke=await page(),concurrentRevokeSchedule=await schedule(concurrentRevoke.id);let release,locked,authReached;
 const held=new Promise(resolve=>{release=resolve;}),ready=new Promise(resolve=>{locked=resolve;}),authLock=new Promise(resolve=>{authReached=resolve;});
 const revokeTx=db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "CongressMembership" WHERE "congressId"=${demo.id} AND "userId"=${user.id} FOR UPDATE`;
  await tx.congressMembership.update({where:{congressId_userId:{congressId:demo.id,userId:user.id}},data:{active:false}});locked();await held;
  // Mirror the real revoke writer, including its Congress FK check.
  await tx.auditLog.create({data:{actorId:user.id,congressId:demo.id,organizationId:'local-org-a',action:'cms.schedule.test.revocation',targetId:user.id}});
 },{timeout:10000});
 const observed={cmsPublicationSchedule:db.cmsPublicationSchedule,$transaction:(operation,options)=>db.$transaction(tx=>operation(new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$queryRaw')return(...args)=>{const sql=Array.isArray(args[0])?args[0].join(''):'';if(sql.includes('"CongressMembership"')&&sql.includes('FOR SHARE'))authReached();return value.apply(target,args);};return typeof value==='function'?value.bind(target):value;}})),options)};
 await ready;const racingWorker=work(observed);let timeout;
 try{await Promise.race([authLock,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Worker did not reach the authorization row lock')),5000);})]);}finally{clearTimeout(timeout);release();}
 await Promise.all([revokeTx,racingWorker]);
 ok((await row(concurrentRevokeSchedule.id)).status==='BLOCKED','Concurrent revocation plus its audit FK is serialized without deadlock and blocks publication');
 await db.congressMembership.update({where:{congressId_userId:{congressId:demo.id,userId:user.id}},data:{active:true}});
 const disabled=await page(),disabledSchedule=await schedule(disabled.id);await db.platformUser.update({where:{id:user.id},data:{active:false}});await blocked(disabledSchedule.id,'Disabled author account blocks the schedule');await db.platformUser.update({where:{id:user.id},data:{active:true}});
 const modulePage=await page(),moduleSchedule=await schedule(modulePage.id);await toggle(false);await blocked(moduleSchedule.id,'Closing CMS prevents publication at execution');await toggle(true);
 const closed=await page(),closedSchedule=await schedule(closed.id);await db.congress.update({where:{id:demo.id},data:{closedAt:new Date()}});await blocked(closedSchedule.id,'Closing the congress prevents scheduled publication');await db.congress.update({where:{id:demo.id},data:{closedAt:null}});
 const language=await page(),languageSchedule=await schedule(language.id);await db.congress.update({where:{id:demo.id},data:{configuration:{...configuration,languages:['EN']}}});await blocked(languageSchedule.id,'The current congress language gate is rechecked at execution');await db.congress.update({where:{id:demo.id},data:{configuration}});
 const target=await page();await publication(target.id);const targetState=await get(target.id),linkDoc=document('Bağlantılı zamanlama');linkDoc.translations.tr.blocks.push({id:'link',type:'button',label:'Hedef sayfa',target:'PAGE',pageSlug:targetState.page.slug,url:''});
 const linked=await page(linkDoc),linkedSchedule=await schedule(linked.id);await publication(target.id,'WITHDRAW');await blocked(linkedSchedule.id,'Withdrawing a required target page blocks execution');
 const recordDoc=emptyRecord('PERSON');recordDoc.translations.tr.title='Sentetik ortak kişi';const record=await db.siteRecord.create({data:{congressId:demo.id,kind:'PERSON',internalName:'Synthetic person',draft:recordDoc,published:recordDoc,publishedVersion:1}});
 const dynamicDoc=document('Ortak kaynak');dynamicDoc.translations.tr.blocks.push({id:'dynamic',type:'dynamic',source:'PERSON',recordId:record.id,label:'Kişiler'});const dynamic=await page(dynamicDoc),dynamicSchedule=await schedule(dynamic.id);await db.siteRecord.update({where:{id:record.id},data:{archived:true}});await blocked(dynamicSchedule.id,'An archived dynamic source is revalidated before publishing');
 const png=await sharp({create:{width:20,height:20,channels:3,background:'#246b46'}}).png().toBuffer(),form=new FormData();form.set('internalName','Synthetic schedule image');form.set('file',new File([png],'local.png',{type:'image/png'}));const media=await post('/api/platform/cms/media',form,admin,201);
 const mediaDoc=document('Görsel kaynak');mediaDoc.translations.tr.blocks.push({id:'image',type:'image',mediaId:media.id,alt:'Sentetik görsel',caption:''});const mediaPage=await page(mediaDoc),mediaSchedule=await schedule(mediaPage.id);await json('/api/platform/cms/media/'+media.id,{method:'PATCH',body:{version:1,internalName:'Synthetic schedule image',active:false}});await blocked(mediaSchedule.id,'Hidden media is revalidated and cannot become public through scheduling');
 const tampered=await page(),tamperedSchedule=await schedule(tampered.id);await db.cmsPage.update({where:{id:tampered.id},data:{draft:document('Out-of-band changed content')}});await blocked(tamperedSchedule.id,'A source hash mismatch blocks even an out-of-band change without a version bump');
 const expiredSession=await page(),expiredSchedule=await schedule(expiredSession.id);await db.platformSession.updateMany({where:{userId:user.id},data:{expiresAt:new Date(Date.now()-1000)}});await work();ok((await row(expiredSchedule.id)).status==='PUBLISHED','Durable approval survives session expiry while the author still holds the publishing role');
 const foreign=await db.congress.create({data:{slug:'cms-schedule-foreign-'+suffix,name:'Synthetic other congress',organizationId:'local-org-b',configuration,modules:{create:{key:'CMS',enabled:true}}}});await post('/api/platform/context',{congressId:foreign.id});await req(ap+'/'+first.id+'/schedule',{status:404});await post('/api/platform/context',{congressId:demo.id});ok(true,'Schedule reads are scoped to the selected congress');
 ok(await db.emailMessage.count({where:{congressId:demo.id}})===0,'Scheduled page publishing produces no email');
 writeFileSync('.local/cms-schedule-check-result.json',JSON.stringify({checkedAt:new Date().toISOString(),congressId:demo.id,slug:demo.slug,checks,localOnly:true,realEmailsSent:0},null,2)+'\n',{mode:0o600});
 console.log('CMS schedule checks passed: '+checks.length+'; local synthetic only.');
}finally{await db.$disconnect();}
