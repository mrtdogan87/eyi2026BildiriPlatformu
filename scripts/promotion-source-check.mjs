import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {PDFDocument} from 'pdf-lib';
import {loadEnv} from './load-env.mjs';
import {assertLocal} from './environment.mjs';
import {profileConfiguration} from '../src/modules/congress/configuration.ts';
import {defaultSettings} from '../src/modules/promotion/core.ts';
import {emptyRecord} from '../src/modules/content/configuration.ts';

loadEnv();assertLocal();
const db=new PrismaClient(),base=process.env.APP_BASE_URL,accounts=JSON.parse(readFileSync('.local/p03-accounts.json','utf8')),jar=new Map(),checks=[],suffix=randomUUID().slice(0,8),ap='/api/platform/promotion',common={reason:'Synthetic invitation source acceptance check.',confirmed:true};
const ok=(value,label)=>{assert.ok(value,label);checks.push(label);};
async function req(path,{method='GET',body,status=200,anonymous=false}={}){
 const r=await fetch(base+path,{method,redirect:'manual',headers:{...(!anonymous?{cookie:[...jar].map(([k,v])=>k+'='+v).join(';')}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal(r.status,status,method+' '+path+': '+await(r.status===status?Promise.resolve(''):r.clone().text()));
 if(!anonymous)for(const c of r.headers.getSetCookie()){const [k,...v]=c.split(';')[0].split('=');if(v.join('='))jar.set(k,v.join('='));else jar.delete(k);}
 return r;
}
const json=async(path,options)=>(await req(path,options)).json(),post=(path,body,status=200)=>json(path,{method:'POST',body,status}),manager=()=>json(ap);
const act=(action,input,status=200)=>post(ap,{action,input:{...common,...input}},status);
async function save(settings,status=200){const d=(await manager()).design;return act('SAVE',{id:d?.id??null,version:d?.version??0,settings,imageId:null},status);}
async function preview(locale='tr',status=200){return post(ap+'/preview',{version:(await manager()).design.version,kind:'INVITATION',format:'PRINT',locale},status);}
async function generate(p,locale='tr',status=200){return act('GENERATE',{version:(await manager()).design.version,kind:'INVITATION',format:'PRINT',locale,previewHash:p.previewHash},status);}
async function publish(id,status=200){const output=(await manager()).outputs.find(o=>o.id===id);return act('PUBLISH',{id,version:output.publicationVersion,published:true},status);}
async function changeFacts(facts){const current=await json('/api/platform/congresses/settings');return json('/api/platform/congresses/settings',{method:'PATCH',body:{configVersion:current.configVersion,settings:{...current.settings,configuration:{...current.settings.configuration,invitationFacts:facts}}}});}
async function recordSave(id,document){const r=(await json('/api/platform/content/'+id)).record;return json('/api/platform/content/'+id,{method:'PATCH',body:{version:r.version,internalName:r.internalName,document}});}
async function recordAction(id,action){const r=(await json('/api/platform/content/'+id)).record;return post('/api/platform/content/'+id+'/publication',{version:r.version,action});}
async function recordCreate(kind,tr,en,extra={}){const r=await post('/api/platform/content',{kind,internalName:'Source check '+kind},201),doc={...emptyRecord(kind),...extra};doc.translations={tr:{enabled:true,title:tr,body:''},en:{enabled:true,title:en,body:''}};await recordSave(r.id,doc);await recordAction(r.id,'PUBLISH');return {id:r.id,doc};}
let demo;
try{
 const config=profileConfiguration('REGISTRATION_ONLY');config.modules.REGISTRATION=false;
 demo=await db.congress.create({data:{slug:'p18-sources-'+suffix,name:'P18 kaynak denetimi '+suffix,organizationId:'local-org-a',configuration:config,modules:{create:{key:'PROMOTION',enabled:true}}}});
 await post('/api/admin/login',accounts.platform);await post('/api/platform/context',{congressId:demo.id});
 const manual={...defaultSettings,invitationTr:'Elle yazılan davet metni ve değiştirilmemiş kişisel kapanış.',signatureTr:'Elle yazılan imza'};
 await save(manual);const baseline=await preview(),legacy=await generate(baseline);await publish(legacy.id);
 ok((await manager()).outputs.find(o=>o.id===legacy.id).current,'A manually edited invitation works with PROMOTION as the only module');
 const facts={theme:{tr:'Bilim ve toplum',en:'Science and society'},participationMode:'HYBRID'};
 await changeFacts(facts);ok(!(await manager()).outputs.find(o=>o.id===legacy.id).current,'Congress source changes mark an earlier output stale');
 await generate(baseline,'tr',409);await publish(legacy.id,409);
 ok((await json('/api/public/congresses/'+demo.slug+'/promotion',{anonymous:true})).files.length===0,'Stale congress facts cannot keep an old output public');
 ok((await manager()).design.settings.invitationTr===manual.invitationTr,'Changing congress facts never overwrites manually edited invitation text');
 const linked={...manual,invitationTr:'Elle yazılan giriş. Tema: {theme}. Katılım: {participationMode}.\n{signature}',invitationEn:'Manually written opening. Theme: {theme}. Attendance: {participationMode}.\n{signature}'};
 await save(linked);const tr=await preview(),en=await preview('en');
 ok(tr.text.includes('Bilim ve toplum')&&tr.text.includes('Hibrit')&&tr.text.includes(manual.signatureTr),'Turkish invitation resolves the real congress theme and attendance mode, preserving the manual signature');
 ok(en.text.includes('Science and society')&&en.text.includes('Hybrid')&&!en.text.includes('Bilim ve toplum'),'English invitation uses its own congress facts without Turkish fallback');
 ok(await db.congressModule.count({where:{congressId:demo.id,enabled:true}})===1,'Theme and attendance facts need no CMS module');
 const p=await generate(tr),pdf=await PDFDocument.load(await(await req(ap+'/files/'+p.id)).arrayBuffer());ok(pdf.getPageCount()===1,'Source-backed invitation is a real one-page PDF');
 await changeFacts({...facts,participationMode:'ONLINE'});await generate(tr,'tr',409);ok(!(await manager()).outputs.find(o=>o.id===p.id).current,'Changing attendance mode invalidates the old preview and output');
 await changeFacts({...facts,theme:{tr:'Yeni bilimsel tema',en:''}});await preview('en',422);ok((await preview()).text.includes('Yeni bilimsel tema'),'A changed theme resolves afresh and missing English theme is explicit');await changeFacts(facts);
 await json('/api/platform/modules',{method:'PATCH',body:{key:'CMS',enabled:true}});
 const person=await recordCreate('PERSON','Prof. Şule Işık','Professor Şule Işık');
 const relation={personId:person.id,role:{tr:'Kongre Başkanı',en:'Congress Chair'},talk:{tr:'',en:''},pageSlug:''};
 const committee=await recordCreate('COMMITTEE','Düzenleme Kurulu','Organizing Committee',{people:[relation]});
 const chairSettings={...linked,chairSource:{recordId:committee.id,personId:person.id},invitationTr:linked.invitationTr+'\n{chair}',invitationEn:linked.invitationEn+'\n{chair}'};
 await save(chairSettings);const chaired=await preview(),chairedEn=await preview('en');
 ok(chaired.text.includes('Prof. Şule Işık · Kongre Başkanı')&&chairedEn.text.includes('Professor Şule Işık · Congress Chair'),'Chair resolves through the explicitly selected published relationship in each locale');
 const output=await generate(chaired);await publish(output.id);
 person.doc.translations.tr.title='Prof. Yeni Başkan';await recordSave(person.id,person.doc);
 ok((await manager()).outputs.find(o=>o.id===output.id).current,'Unpublished person drafts do not silently change a published invitation source');
 await recordAction(person.id,'PUBLISH');await generate(chaired,'tr',409);await publish(output.id,409);
 ok((await preview()).text.includes('Prof. Yeni Başkan'),'Publishing a new person name invalidates the old approval and resolves the new source');
 committee.doc.people[0].role.en='';await recordSave(committee.id,committee.doc);await recordAction(committee.id,'PUBLISH');await preview('en',422);ok(true,'Missing English chair role cannot fall back to the Turkish role');
 await recordAction(person.id,'WITHDRAW');await preview('tr',422);ok((await json('/api/public/congresses/'+demo.slug+'/promotion',{anonymous:true})).files.length===0,'Withdrawing a linked chairman removes dependent outputs from public delivery');
 await save({...chairSettings,chairSource:{recordId:'foreign-committee',personId:person.id}},400);ok(true,'Foreign or unrelated chairman references cannot be saved');
 await save(manual);const restored=await preview();ok(restored.text===manual.invitationTr,'Removing an optional source returns to the unchanged manual invitation');
 await json('/api/platform/modules',{method:'PATCH',body:{key:'CMS',enabled:false}});await preview();ok((await manager()).chairOptions.length===0,'Manual promotion remains independent when CMS closes');
 writeFileSync('.local/p18-source-check-result.json',JSON.stringify({checkedAt:new Date().toISOString(),congressId:demo.id,slug:demo.slug,checks,localOnly:true,realEmailsSent:0},null,2)+'\n',{mode:0o600});
 console.log('P18 linked source checks passed: '+checks.length+'; local synthetic only.');
}finally{await db.$disconnect();}
