import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDocument,newBlock} from '../src/modules/cms/configuration.ts';
import {profileConfiguration} from '../src/modules/congress/configuration.ts';
import {scheduleInputSchema,futureScheduleDate,istanbulScheduleInput,istanbulScheduleIso} from '../src/modules/cms/scheduling.ts';
import {CmsPublicationError,validateCmsPublication} from '../src/modules/cms/publication.mjs';
import {cmsSourceHash,scheduledActorRole,scheduledSourceCurrent} from '../src/modules/cms/schedule-worker.mjs';

const congressId='congress-a';
const scheduleId='10000000-0000-4000-8000-000000000001';
function completeDocument(){
 const doc=emptyDocument();
 doc.translations.tr.title='Katılım rehberi';
 doc.translations.tr.blocks=[{...newBlock('paragraph','tr-body'),text:'Türkçe katılım bilgileri.'}];
 return doc;
}
function publicationFixture(doc=completeDocument(),overrides={}){
 const page={id:'page-a',congressId,slug:'rehber',draft:doc,archived:false,publishedRevision:null,publishedRevisionId:null,aliases:[]};
 const pages=overrides.pages??[page];
 const media=overrides.media??[];
 const records=overrides.records??[];
 const modules=overrides.modules??[{congressId,key:'CMS',enabled:true}];
 const scope=where=>assert.equal(where.congressId,congressId,'Every publication dependency query must use the current congress');
 const tx={
  cmsPage:{
   findMany:async({where})=>{scope(where);return pages.filter(p=>p.congressId===where.congressId&&p.archived===where.archived);},
   findFirst:async({where})=>{scope(where);return pages.find(p=>p.congressId===where.congressId&&p.archived===where.archived&&where.OR.some(condition=>condition.slug===p.slug||condition.aliases&&p.aliases.some(a=>a.slug===condition.aliases.some.slug)))??null;},
  },
  congressModule:{findMany:async({where})=>{scope(where);return modules.filter(m=>m.congressId===where.congressId);}},
  cmsMedia:{findMany:async({where})=>{scope(where);return media.filter(m=>m.congressId===where.congressId&&where.id.in.includes(m.id));}},
  siteRecord:{
   findFirst:async({where})=>{scope(where);return records.find(r=>r.congressId===where.congressId&&r.id===where.id&&r.kind===where.kind&&r.archived===where.archived)??null;},
   count:async({where})=>{scope(where);assert.deepEqual(where.publishedVersion,{not:null});return records.filter(r=>r.congressId===where.congressId&&r.kind===where.kind&&r.archived===where.archived&&r.publishedVersion!==null).length;},
  },
 };
 return {tx,input:{congressId,page,doc,configuration:overrides.configuration??profileConfiguration()}};
}
async function publishable(doc,overrides){const {tx,input}=publicationFixture(doc,overrides);return validateCmsPublication(tx,input);}
async function rejected(doc,overrides,message){await assert.rejects(()=>publishable(doc,overrides),error=>error instanceof CmsPublicationError&&error.status===400&&message.test(error.message));}

test('Istanbul input converts to a UTC instant and round-trips across the UTC date boundary',()=>{
 assert.equal(istanbulScheduleIso('2026-10-07T00:30'),'2026-10-06T21:30:00.000Z');
 assert.equal(istanbulScheduleInput('2026-10-06T21:30:00.000Z'),'2026-10-07T00:30');
 assert.equal(istanbulScheduleInput(new Date('2026-10-06T21:30:00.000Z')),'2026-10-07T00:30');
 assert.equal(istanbulScheduleIso('2028-02-29T12:00'),'2028-02-29T09:00:00.000Z');
});
test('Istanbul scheduling rejects impossible dates, rollover hours and unlabelled input formats',()=>{
 for(const value of ['','2026-02-29T12:00','2026-04-31T12:00','2026-13-01T12:00','2026-10-07T24:00','2026-10-07T12:60','2026-10-07','2026-10-07T12:00:00','2026-10-07T12:00Z','2026-10-07T12:00+03:00'])assert.throws(()=>istanbulScheduleIso(value),Error,value);
});
test('future publication requires a valid instant strictly after the supplied clock',()=>{
 const now=new Date('2026-10-06T21:30:00.000Z');
 for(const value of ['invalid','2026-10-06T21:29:59.999Z','2026-10-07T00:30:00+03:00'])assert.throws(()=>futureScheduleDate(value,now),/gelecekte/);
 assert.equal(futureScheduleDate('2026-10-07T00:30:00.001+03:00',now).toISOString(),'2026-10-06T21:30:00.001Z');
});
test('schedule creation requires confirmation, a saved version, reason and explicit instant',()=>{
 const input={action:'SCHEDULE',version:3,reason:'Yayın içeriği kontrol edildi.',confirmed:true,expectedScheduleId:null,dueAt:'2026-10-07T12:00:00+03:00'};
 assert.equal(scheduleInputSchema.safeParse(input).success,true);
 assert.equal(scheduleInputSchema.safeParse({...input,expectedScheduleId:scheduleId}).success,true);
 for(const patch of [{confirmed:false},{confirmed:undefined},{version:0},{version:1.5},{reason:'kısa'},{dueAt:'2026-10-07T12:00'},{dueAt:'2026-02-29T12:00:00Z'},{expectedScheduleId:undefined},{expectedScheduleId:'forged'},{congressId:'foreign'}])assert.equal(scheduleInputSchema.safeParse({...input,...patch}).success,false,JSON.stringify(patch));
});
test('cancellation requires the exact schedule ID and explicit reason and confirmation',()=>{
 const input={action:'CANCEL',version:3,reason:'İçerik yeniden incelenecek.',confirmed:true,scheduleId};
 assert.equal(scheduleInputSchema.safeParse(input).success,true);
 for(const patch of [{scheduleId:undefined},{scheduleId:'invalid'},{confirmed:false},{reason:' '},{dueAt:'2026-10-07T12:00:00Z'},{expectedScheduleId:null}])assert.equal(scheduleInputSchema.safeParse({...input,...patch}).success,false);
});

test('scheduled publishing checks current CMS role without requiring a browser session',()=>{
 const user={id:'editor-a',active:true,platformAdmin:false};
 assert.equal(scheduledActorRole(user,{active:true,organizer:false},{active:true,role:'CONTENT_EDITOR'}),'CONTENT_EDITOR');
 assert.equal(scheduledActorRole(user,{active:true,organizer:true},null),'ORGANIZER');
 assert.equal(scheduledActorRole({...user,platformAdmin:true},null,null),'PLATFORM_ADMIN');
});
test('revoked users, memberships and roles cannot retain scheduled publishing authority',()=>{
 const user={active:true,platformAdmin:false},org={active:true,organizer:false},member={active:true,role:'CONTENT_EDITOR'};
 for(const [u,o,m] of [[null,org,member],[{...user,active:false},org,member],[{...user,active:false,platformAdmin:true},null,null],[user,null,member],[user,{...org,active:false},member],[user,org,null],[user,org,{...member,active:false}],[user,org,{...member,role:'SECRETARY'}],[user,org,{...member,role:'PARTICIPANT'}]])assert.equal(scheduledActorRole(u,o,m),null);
});
test('source hash ignores object key insertion order but binds content and array ordering',()=>{
 assert.match(cmsSourceHash({title:'Draft',translations:{tr:{enabled:true,blocks:['one','two']}}}),/^[a-f0-9]{64}$/);
 assert.equal(cmsSourceHash({title:'Draft',translations:{tr:{enabled:true,blocks:['one','two']}}}),cmsSourceHash({translations:{tr:{blocks:['one','two'],enabled:true}},title:'Draft'}));
 assert.notEqual(cmsSourceHash({blocks:['one','two']}),cmsSourceHash({blocks:['two','one']}));
 assert.notEqual(cmsSourceHash({title:'Approved'}),cmsSourceHash({title:'Unapproved'}));
});
function scheduledFixture(){
 const draft=completeDocument(),page={id:'page-a',congressId,archived:false,version:7,draft};
 const source={id:'revision-a',pageId:page.id,number:7,content:structuredClone(draft)};
 const schedule={pageId:page.id,congressId,sourceRevisionId:source.id,sourceVersion:7,sourceHash:cmsSourceHash(draft)};
 return {schedule,page,source};
}
test('scheduled source is current only for the exact saved page version and matching draft/revision content',()=>{
 const {schedule,page,source}=scheduledFixture();
 assert.equal(scheduledSourceCurrent(schedule,page,source),true);
 for(const p of [null,{...page,id:'other-page'},{...page,congressId:'foreign'},{...page,archived:true},{...page,version:8},{...page,draft:{...page.draft,menuOrder:999}}])assert.equal(scheduledSourceCurrent(schedule,p,source),false);
 for(const s of [null,{...source,pageId:'other-page'},{...source,number:6},{...source,content:{...source.content,menuOrder:999}}])assert.equal(scheduledSourceCurrent(schedule,page,s),false);
 for(const s of [{...schedule,sourceVersion:6},{...schedule,congressId:'foreign'},{...schedule,sourceHash:'0'.repeat(64)}])assert.equal(scheduledSourceCurrent(s,page,source),false);
});

test('shared publication gate permits a complete TR page with incomplete English switched off',async()=>{
 const doc=completeDocument();doc.translations.en.title='Unfinished English draft';
 const before=structuredClone(doc);
 assert.deepEqual(await publishable(doc),[]);
 assert.deepEqual(doc,before,'Publication validation must not rewrite or enable the saved translation');
});
test('shared publication gate rejects incomplete enabled English and no enabled congress language',async()=>{
 const doc=completeDocument();doc.translations.en.enabled=true;doc.translations.en.title='English guide';
 await rejected(doc,{},/^EN:/);
 doc.translations.en.enabled=false;
 await rejected(doc,{configuration:{...profileConfiguration(),languages:['EN']}},/açık dillerden/);
});
test('shared publication gate rejects buttons into disabled submission and registration modules',async()=>{
 for(const target of ['SUBMISSIONS','REGISTRATION']){
  const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('button','apply'),label:'Başvur',target});
  await rejected(doc,{modules:[{congressId,key:target,enabled:false}]},/Kapalı modüle/);
  assert.deepEqual(await publishable(doc,{modules:[{congressId,key:target,enabled:true}]}),[]);
 }
});
test('shared publication gate ignores incomplete disabled-language buttons',async()=>{
 const doc=completeDocument();doc.translations.en.blocks=[{...newBlock('button','en-apply'),target:'REGISTRATION'}];
 assert.deepEqual(await publishable(doc),[]);
});
test('shared publication gate rejects missing, withdrawn, archived and foreign page targets',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('button','details'),label:'Ayrıntılar',target:'PAGE',pageSlug:'hedef'});
 const target={id:'target-page',congressId,slug:'hedef',draft:completeDocument(),archived:false,aliases:[],publishedRevision:null,publishedRevisionId:null};
 for(const pages of [[],[target],[{...target,archived:true,publishedRevisionId:'pub'}],[{...target,congressId:'foreign',publishedRevisionId:'pub'}]])await rejected(doc,{pages},/Bağlantı hedefi/);
});
test('shared publication gate allows published page aliases and a self link',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('button','details'),label:'Ayrıntılar',target:'PAGE',pageSlug:'eski-hedef'});
 const target={id:'target-page',congressId,slug:'yeni-hedef',draft:completeDocument(),archived:false,aliases:[{slug:'eski-hedef'}],publishedRevision:{content:completeDocument()},publishedRevisionId:'pub'};
 assert.deepEqual(await publishable(doc,{pages:[target]}),[]);
 doc.translations.tr.blocks.at(-1).pageSlug='rehber';
 assert.deepEqual(await publishable(doc),[]);
});
test('shared publication gate rejects inactive, absent, foreign and wrong-kind media',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('image','cover'),mediaId:'image-a',alt:'Kongre görseli'});
 const image={id:'image-a',congressId,active:true,kind:'IMAGE'};
 for(const media of [[],[{...image,congressId:'foreign'}]])await rejected(doc,{media},/bu kongreye ait değil/);
 await rejected(doc,{media:[{...image,active:false}]},/yeniden açın/);
 await rejected(doc,{media:[{...image,kind:'PDF'}]},/doğru medya türünü/);
 assert.deepEqual(await publishable(doc,{media:[image]}),['image-a']);
});
test('publication reference output excludes disabled English media but preserves its draft',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('image','tr-image'),mediaId:'tr-image',alt:'Türkçe kapak'});doc.translations.en.blocks=[{...newBlock('image','en-image'),mediaId:'en-image',alt:'English cover'}];
 const media=[{id:'tr-image',congressId,active:true,kind:'IMAGE'},{id:'en-image',congressId,active:false,kind:'IMAGE'}],before=structuredClone(doc);
 assert.deepEqual(await publishable(doc,{media}),['tr-image']);
 assert.deepEqual(doc,before);
});
test('shared publication gate allows a document download but rejects an image in a download block',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('download','document'),mediaId:'document-a',label:'Başvuru rehberi'});
 for(const kind of ['PDF','WORD_TEMPLATE'])assert.deepEqual(await publishable(doc,{media:[{id:'document-a',congressId,active:true,kind}]}),['document-a']);
 await rejected(doc,{media:[{id:'document-a',congressId,active:true,kind:'IMAGE'}]},/doğru medya türünü/);
});
test('shared publication gate rejects withdrawn, archived, wrong-kind and foreign selected dynamic records',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('dynamic','committee'),source:'COMMITTEE',recordId:'record-a',label:'Bilim kurulu'});
 const record={id:'record-a',congressId,kind:'COMMITTEE',archived:false,publishedVersion:2};
 for(const records of [[],[{...record,publishedVersion:null}],[{...record,archived:true}],[{...record,kind:'PERSON'}],[{...record,congressId:'foreign'}]])await rejected(doc,{records},/Dinamik kaynak/);
 assert.deepEqual(await publishable(doc,{records:[record]}),[]);
});
test('shared publication gate requires at least one current published record for a dynamic collection',async()=>{
 const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('dynamic','committee'),source:'COMMITTEE',recordId:'',label:'Bilim kurulu'});
 const record={id:'record-a',congressId,kind:'COMMITTEE',archived:false,publishedVersion:2};
 for(const records of [[],[{...record,publishedVersion:null}],[{...record,archived:true}],[{...record,congressId:'foreign'}]])await rejected(doc,{records},/önce bir kayıt yayımlayın/);
 assert.deepEqual(await publishable(doc,{records:[record]}),[]);
});
test('shared publication gate does not accept record IDs on derived date, fee or feedback sources',async()=>{
 for(const source of ['DATES','FEES','FEEDBACK']){
  const doc=completeDocument();doc.translations.tr.blocks.push({...newBlock('dynamic','derived'),source,recordId:'record-a',label:'Bilgi'});
  await rejected(doc,{},/tek kayıt seçimi kullanmaz/);
  doc.translations.tr.blocks.at(-1).recordId='';assert.deepEqual(await publishable(doc),[]);
 }
});
test('shared publication gate rejects menu cycles including an old alias of the same page',async()=>{
 const doc=completeDocument();doc.menuParent='eski-rehber';
 const own={id:'page-a',congressId,slug:'rehber',draft:doc,archived:false,aliases:[{slug:'eski-rehber'}],publishedRevision:null};
 await rejected(doc,{pages:[own]},/döngü/);
 const parentDoc=completeDocument();parentDoc.menuParent='rehber';
 doc.menuParent='ust-sayfa';
 const parent={id:'parent',congressId,slug:'ust-sayfa',draft:parentDoc,archived:false,aliases:[],publishedRevision:{content:parentDoc}};
 await rejected(doc,{pages:[own,parent]},/döngü/);
});
test('shared publication gate rejects unpublished menu parents and uses the published parent graph',async()=>{
 const doc=completeDocument();doc.menuParent='ust-sayfa';
 const parentDraft=completeDocument();parentDraft.menuParent='rehber';
 const parent={id:'parent',congressId,slug:'ust-sayfa',draft:parentDraft,archived:false,aliases:[],publishedRevision:null};
 await rejected(doc,{pages:[parent]},/Üst menü/);
 assert.deepEqual(await publishable(doc,{pages:[{...parent,publishedRevision:{content:completeDocument()}}]}),[]);
});
