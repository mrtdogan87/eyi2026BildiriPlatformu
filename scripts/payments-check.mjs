import {contextRequestBody} from './intervention-test-requests.mjs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { profileConfiguration } from '../src/modules/congress/configuration.ts';
import { statementHeader } from '../src/modules/payments/csv.ts';
loadEnv(); assertLocal();
const db=new PrismaClient(), base=process.env.APP_BASE_URL, suffix=randomUUID().slice(0,8), checks=[];
const accounts=JSON.parse(readFileSync('.local/p03-accounts.json','utf8'));
const jars=Object.fromEntries(['platform','secretary','editor','participant','organizerB'].map(k=>[k,new Map()]));
const pdf=readFileSync('scripts/fixtures/synthetic-receipt.pdf'), sha=v=>createHash('sha256').update(v).digest('hex');
const ok=(v,label)=>{assert.ok(v,label);checks.push(label);};
async function req(path,{method='GET',body,jar=jars.platform,status=200,origin}={}) {
 const response=await fetch(base+path,{method,redirect:'manual',headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join(';'),...(body!==undefined&&!(body instanceof FormData)?{'content-type':'application/json'}:{}),...(origin?{origin}:{})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(contextRequestBody(path,body))});
 let diagnostic=''; if(![].concat(status).includes(response.status)){const error=await response.clone().json().catch(()=>null);if(typeof error?.error==='string')diagnostic=error.error.replace(/https?:\/\/\S+/gi,'[url]').replace(/\b[^\s@]+@[^\s@]+\b/g,'[email]').replace(/\b[A-Za-z0-9_-]{24,}\b/g,'[redacted]').slice(0,300);}
 assert.ok([].concat(status).includes(response.status),`${method} ${path}: expected ${status}, received ${response.status}; ${diagnostic}`);
 for(const c of response.headers.getSetCookie()){const [k,...p]=c.split(';')[0].split('=');if(p.join('='))jar.set(k,p.join('='));else jar.delete(k);}
 return response;
}
const json=async(p,o)=> (await req(p,o)).json(), post=(p,body,jar=jars.platform,status=200)=>json(p,{method:'POST',body,jar,status});
const endpoint=id=>`/api/admin/registrations/${id}/payments`, view=id=>json(endpoint(id));
const input=(kind,version,patch={})=>({kind,version,reason:'Synthetic bank evidence reviewed',confirmed:true,...patch});
function form(payload,evidence){const f=new FormData();f.set('payload',JSON.stringify(payload));if(evidence!==undefined)f.set('evidence',new Blob([evidence],{type:'application/pdf'}),'synthetic-bank-proof.pdf');return f;}
const act=(id,kind,version,patch={},proof,status=200,jar=jars.platform)=>post(endpoint(id),form(input(kind,version,patch),proof),jar,status);
const monetary=(amount,reference)=>({amount,currency:'TRY',reference,occurredAt:'2026-10-01T00:00:00.000Z'});
const csv=lines=>Buffer.from(statementHeader.join(',')+'\r\n'+lines.join('\r\n')+'\r\n');
function upload(bytes,accountKey='bank-test',patch={}){const f=new FormData();f.set('payload',JSON.stringify({accountKey,note:'Synthetic statement from local fixture',...patch}));f.set('file',new Blob([bytes],{type:'text/csv'}),'synthetic-bank.csv');return f;}
let demo,foreign,A,B,C,D,E,G,H,U;
try{
 for(const k of Object.keys(jars))await post('/api/admin/login',accounts[k],jars[k]);
 const config=profileConfiguration('REGISTRATION_ONLY');
 demo=await db.congress.create({data:{organizationId:'local-org-a',slug:`p12-payments-${suffix}`,name:`P12 Ödeme Doğrulama ${suffix}`,configuration:config,memberships:{create:[{userId:'local-user-secretary',role:'SECRETARY'},{userId:'local-user-editor',role:'CONTENT_EDITOR'},{userId:'local-user-participant',role:'PARTICIPANT'}]},modules:{create:[{key:'REGISTRATION',enabled:true}]}}});
 foreign=await db.congress.create({data:{organizationId:'local-org-b',slug:`p12-foreign-${suffix}`,name:'P12 foreign',configuration:config,modules:{create:[{key:'REGISTRATION',enabled:true}]}}});
 const make=async(name,patch={})=>db.registration.create({data:{congressId:demo.id,email:`p12-${name}-${suffix}@example.invalid`,kind:'LISTENER',paymentPeriod:'EARLY',totalAmount:100,currency:'TRY',paymentDescription:`Synthetic unique description ${name} ${suffix}`,...patch}});
 A=await make('a',{email:accounts.participant.email,paidAt:new Date(),receipt:{create:{originalName:'synthetic.pdf',mimeType:'application/pdf',fileSize:pdf.length,storageKey:'database:p12-synthetic',content:pdf}}});B=await make('b',{email:accounts.participant.email});C=await make('c');D=await make('d',{totalAmount:0});E=await make('e',{currency:'EUR'});G=await make('g');H=await make('h');U=await make('ui');const foreignReg=await make('foreign',{congressId:foreign.id});
 for(const k of ['platform','secretary','editor','participant'])await post('/api/platform/context',{congressId:demo.id},jars[k]);await post('/api/platform/context',{congressId:'local-congress-b'},jars.organizerB);
 await req(endpoint(A.id),{jar:new Map(),status:401});await req('/api/platform/payments/template',{jar:new Map(),status:401});ok(true,'Anonymous history, bank template and payment access require authentication');
 for(const k of ['editor','participant']){await req(endpoint(A.id),{jar:jars[k],status:403});await act(A.id,'PENDING',0,{},undefined,403,jars[k]);await req('/api/platform/payments',{jar:jars[k],status:403});}ok(true,'Editor and participant cannot inspect bank data or verify payments');
 await req(endpoint(foreignReg.id),{status:404});await req(endpoint(A.id),{jar:jars.organizerB,status:404});ok(true,'Congress and organization boundaries hide foreign registrations');
 const v0=await view(A.id), original=await db.registration.findUniqueOrThrow({where:{id:A.id},include:{receipt:true}});
 ok(v0.summary.state==='RECEIPT_RECEIVED_UNVERIFIED'&&v0.summary.receivedMinor===0&&(await view(D.id)).summary.state==='NO_CHARGE','Legacy paidAt, receipt and free tariff do not generate bank confirmation');
 await req(endpoint(A.id),{method:'POST',body:form(input('PENDING',0)),origin:'https://foreign.example.invalid',status:403});ok(await db.paymentEvent.count({where:{congressId:demo.id}})===0,'Cross-origin writes fail before payment mutation');
 await act(A.id,'PENDING',0,{confirmed:false},undefined,400);await act(A.id,'PENDING',0,{actorId:'forged'},undefined,400);await act(A.id,'PENDING',0,{reason:'short'},undefined,400);ok(await db.paymentEvent.count({where:{registrationId:A.id}})===0,'Explicit review, bounded reason and server-owned actor are required');
 await act(A.id,'PENDING',0,{},undefined,200,jars.secretary);ok((await view(A.id)).summary.state==='PENDING','Secretary can record pending review without creating payment');
 await act(A.id,'CREDIT',1,monetary('50','manual-A-01'),undefined,400);await act(A.id,'CREDIT',1,monetary('50','manual-A-01'),Buffer.from('not a PDF'),400);ok((await view(A.id)).version===1,'Receipt alone and fake PDF cannot satisfy manual bank evidence');
 await act(A.id,'CREDIT',1,{...monetary('50','manual-A-01'),currency:'EUR'},pdf,400);await act(A.id,'CREDIT',1,monetary('-1','manual-A-01'),pdf,400);await act(A.id,'CREDIT',1,{...monetary('50','manual-A-01'),occurredAt:'2099-01-01T00:00:00.000Z'},pdf,400);ok((await view(A.id)).version===1,'Wrong currency, negative amount and future date create no verification');
 await act(A.id,'CREDIT',1,monetary('50','manual-A-01'),pdf);let v=await view(A.id);ok(v.summary.state==='UNDERPAID'&&v.summary.receivedMinor===5000&&v.summary.differenceMinor===-5000,'Manual verified partial payment is underpaid in exact minor units');
 const firstCredit=v.events.at(-1), proof=await req(endpoint(A.id)+'/'+firstCredit.id);ok(sha(Buffer.from(await proof.arrayBuffer()))===sha(pdf)&&proof.headers.get('cache-control').includes('no-store')&&proof.headers.get('x-content-type-options')==='nosniff','Exact proof download is private, uncached and typed safely');
 await req(endpoint(A.id)+'/'+firstCredit.id,{jar:jars.participant,status:403});await req(endpoint(C.id)+'/'+firstCredit.id,{status:404});ok(true,'Participant and a different registration cannot fetch staff bank evidence');
 await act(A.id,'CREDIT',2,monetary('50','MANUAL-A-01'),pdf,409);await act(C.id,'CREDIT',0,monetary('50','manual-A-01'),pdf,409);ok((await view(A.id)).version===2&&(await view(C.id)).version===0,'Manual bank reference cannot be counted twice, including another registration and casing');
 await act(A.id,'CREDIT',1,monetary('50','stale'),pdf,409);ok((await view(A.id)).version===2,'Stale review cannot overwrite newer payment history');
 await act(A.id,'CREDIT',2,monetary('50','manual-A-02'),pdf);ok((await view(A.id)).summary.state==='VERIFIED','Two independently verified partial payments sum to full payment');
 await act(A.id,'CREDIT',3,monetary('20','manual-A-03'),pdf);v=await view(A.id);const extra=v.events.at(-1);ok(v.summary.state==='OVERPAID'&&v.summary.differenceMinor===2000,'Excess bank payment stays visible as overpayment');
 await act(A.id,'EXEMPT',4,{},undefined,409);ok((await view(A.id)).version===4,'Existing money cannot be silently replaced by exemption');
 await act(A.id,'REFUND',4,monetary('121','refund-A-01'),pdf,400);await act(A.id,'REFUND',4,monetary('20','refund-A-01'),undefined,400);ok((await view(A.id)).summary.refundedMinor===0,'Refund requires external bank proof and cannot exceed verified net payment');
 await act(A.id,'REFUND',4,monetary('20','refund-A-01'),pdf);v=await view(A.id);const refund=v.events.at(-1);ok(v.summary.state==='PARTIALLY_REFUNDED'&&v.summary.netMinor===10000,'Partial refund records actual returned money without cancelling registration');
 await act(A.id,'VOID',5,{targetId:refund.id});ok((await view(A.id)).summary.state==='OVERPAID','Wrong refund is corrected by append-only linked void');
 await act(A.id,'VOID',6,{targetId:extra.id});await act(A.id,'VOID',7,{targetId:extra.id},undefined,409);ok((await view(A.id)).summary.state==='VERIFIED'&&await db.paymentEvent.count({where:{registrationId:A.id}})===7,'Voided payment survives in history and cannot be voided twice');
 await act(A.id,'REFUND',7,monetary('80','refund-A-02'),pdf);await act(A.id,'VOID',8,{targetId:firstCredit.id},undefined,409);ok((await view(A.id)).summary.netMinor===2000,'Payment cannot be voided below its linked refunded balance');
 await act(A.id,'REFUND',8,monetary('20','refund-A-03'),pdf);ok((await view(A.id)).summary.state==='REFUNDED'&&(await view(A.id)).summary.netMinor===0,'Full refund is distinct and recorded only after all verified money is returned');
 await act(C.id,'EXEMPT',0);ok((await view(C.id)).summary.state==='EXEMPT'&&(await view(C.id)).summary.receivedMinor===0,'Invitation/exemption creates no fictitious bank payment or tariff change');
 await act(C.id,'CREDIT',1,monetary('100','manual-C-01'),pdf,409);await act(C.id,'REVOKE_EXEMPT',1);await act(C.id,'CREDIT',2,monetary('100','manual-C-01'),pdf);v=await view(C.id);await act(C.id,'VOID',3,{targetId:v.events.find(e=>e.kind==='REVOKE_EXEMPT').id},undefined,409);ok(v.summary.state==='VERIFIED','Exemption must be revoked before money and cannot be resurrected against active payment');
 const statement=csv([`TX-UNIQUE,2026-10-01,100,TRY,,${G.email},${G.id}`,`TX-AMBIGUOUS,2026-10-01,100,TRY,,${A.email},`,`TX-MISMATCH,2026-10-01,100,EUR,,${E.email},${H.id}`,`TX-DIFFERENCE,2026-10-01,90,TRY,,${H.email},${H.id}`,`TX-NONE,2026-10-01,100,TRY,Anonymous payer,,`,`TX-UI,2026-10-01,100,TRY,,${U.email},${U.id}`]);
 await post('/api/platform/payments',upload(statement),jars.editor,403);await post('/api/platform/payments',upload(statement),jars.participant,403);ok(await db.bankStatement.count({where:{congressId:demo.id}})===0,'Bank import is limited to payment staff');
 const imported=await post('/api/platform/payments',upload(statement));ok(imported.added===6&&(await view(G.id)).summary.receivedMinor===0,'CSV creates private bank evidence and suggestions but no automatic payment');
 let bank=await json('/api/platform/payments');const byRef=ref=>bank.rows.find(r=>r.reference===ref);
 ok(byRef('TX-UNIQUE').suggestion.status==='SUGGESTED'&&byRef('TX-AMBIGUOUS').suggestion.status==='AMBIGUOUS'&&byRef('TX-DIFFERENCE').suggestion.status==='AMOUNT_DIFFERENCE'&&byRef('TX-NONE').suggestion.status==='UNMATCHED','Exact, ambiguous, amount difference and unmatched suggestions are separate');
 const duplicate=await post('/api/platform/payments',upload(statement));ok(duplicate.duplicate&&await db.bankTransaction.count({where:{congressId:demo.id}})===6,'Identical file upload is idempotent and does not repeat bank transactions');
 const overlap=csv([`TX-UNIQUE,2026-10-01,100,TRY,,${G.email},${G.id}`,`TX-NEW,2026-10-01,5,TRY,,,`]);const merged=await post('/api/platform/payments',upload(overlap));ok(merged.added===1&&merged.skipped===1,'Overlapping statements preserve the original transaction and add only new references');
 const collision=csv([`TX-NEW2,2026-10-01,5,TRY,,,`,`TX-UNIQUE,2026-10-01,99,TRY,,${G.email},${G.id}`]);await post('/api/platform/payments',upload(collision),jars.platform,409);ok(await db.bankTransaction.count({where:{congressId:demo.id,reference:'TX-NEW2'}})===0,'Conflicting reference aborts the complete import, including otherwise valid rows');
 const malformed=csv([`TX-GOOD,2026-10-01,5,TRY,,,`,`TX-BAD,2026-02-30,10,TRY,,,`]);await post('/api/platform/payments',upload(malformed),jars.platform,400);ok(await db.bankTransaction.count({where:{congressId:demo.id,reference:'TX-GOOD'}})===0,'One invalid CSV row prevents all statement writes');
 await post('/api/platform/payments',upload(Buffer.alloc(3*1024*1024+1)),jars.platform,413);await act(B.id,'PENDING',0,{},Buffer.alloc(2*1024*1024+1),400);ok((await view(B.id)).version===0,'Request and proof limits reject oversized uploads without payment changes');
 const importedFile=await req('/api/platform/payments/statements/'+imported.id);ok(sha(Buffer.from(await importedFile.arrayBuffer()))===sha(statement)&&importedFile.headers.get('cache-control').includes('no-store'),'Original bank CSV is preserved byte for byte as private evidence');
 await req('/api/platform/payments/statements/'+imported.id,{jar:jars.participant,status:403});await req('/api/platform/payments?statementId='+imported.id,{jar:jars.organizerB,status:404});ok(true,'Participant and foreign organizer cannot read imported statement or bank matches');
 const foreignBank=await db.bankStatement.create({data:{congressId:foreign.id,accountKey:'foreign-account',note:'Foreign private proof',originalName:'foreign.csv',sha256:sha(Buffer.from('foreign')),content:Buffer.from('foreign'),rowCount:1,actorName:'Synthetic'}});const foreignTx=await db.bankTransaction.create({data:{congressId:foreign.id,statementId:foreignBank.id,accountKey:'foreign-account',reference:'FOREIGN',occurredAt:new Date('2026-10-01'),amountMinor:10000,currency:'TRY',description:'Foreign',payerEmail:G.email,registrationRef:G.id,rowNumber:2}});
 await act(G.id,'CREDIT',0,{bankTransactionId:foreignTx.id},undefined,404);ok((await view(G.id)).version===0,'Forged foreign bank transaction cannot be assigned to local registration');
 await act(H.id,'CREDIT',0,{bankTransactionId:byRef('TX-MISMATCH').id},undefined,400);await act(G.id,'CREDIT',0,{bankTransactionId:byRef('TX-UNIQUE').id,amount:'1'},undefined,400);ok((await view(H.id)).version===0,'Currency mismatch and altered statement amount are rejected at approval');
 const race=await Promise.all([act(G.id,'CREDIT',0,{bankTransactionId:byRef('TX-UNIQUE').id},undefined,[200,409]),act(H.id,'CREDIT',0,{bankTransactionId:byRef('TX-UNIQUE').id},undefined,[200,409])]);ok(race.filter(x=>x.eventId).length===1&&await db.paymentEvent.count({where:{bankTransactionId:byRef('TX-UNIQUE').id,voidedBy:null}})===1,'Concurrent approval to two registrations has exactly one winner');
 bank=await json('/api/platform/payments');const assigned=byRef('TX-UNIQUE').assignment, assignedView=await view(assigned), assignedCredit=assignedView.events.find(e=>e.bankTransactionId===byRef('TX-UNIQUE').id);
 await act(assigned,'VOID',assignedView.version,{targetId:assignedCredit.id});await act(G.id,'CREDIT',(await view(G.id)).version,{bankTransactionId:byRef('TX-UNIQUE').id});ok((await view(G.id)).summary.state==='VERIFIED','Wrong bank assignment can be voided and reassigned while original credit and proof survive');
 await act(H.id,'CREDIT',(await view(H.id)).version,{bankTransactionId:byRef('TX-DIFFERENCE').id});ok((await view(H.id)).summary.state==='UNDERPAID','Explicit statement approval with smaller amount records underpayment, not full payment');
 const own=await json('/api/platform/own',{jar:jars.participant});const ownA=own.registrations.find(r=>r.id===A.id);ok(ownA.paymentState==='REFUNDED'&&ownA.payment.refundedMinor===10000&&ownA.paymentVerificationAvailable&&!JSON.stringify(own).includes('manual-A')&&!JSON.stringify(own).includes('Synthetic bank evidence reviewed')&&!JSON.stringify(own).includes('evidenceHash'),'Participant sees own verified totals and refunds without bank references, proof or internal reason');
 const work=await json('/api/platform/worklist');ok(work.sources.missing.some(r=>r.sourceId===H.id&&r.reasons.some(s=>s.includes('Eksik ödeme')))&&!work.sources.missing.some(r=>r.sourceId===G.id&&r.reasons.some(s=>s.includes('doğrula'))),'Secretary worklist exposes underpayment while confirmed payment clears verification task');
 const after=await db.registration.findUniqueOrThrow({where:{id:A.id},include:{receipt:true}});ok(after.totalAmount===original.totalAmount&&after.email===original.email&&after.paidAt.getTime()===original.paidAt.getTime()&&sha(after.receipt.content)===sha(original.receipt.content),'Verification/refund/void preserve original tariff, participant receipt, ownership and legacy paidAt');
 await req(`/api/admin/registrations/${A.id}`,{method:'DELETE',body:{confirmation:'Bu kaydı silmeyi onaylıyorum'},status:409});ok(await db.registration.count({where:{id:A.id}})===1,'Registration with payment history cannot be hard-deleted');
 const auditCount=await db.auditLog.count({where:{congressId:demo.id,action:'payment.record'}}), eventCount=await db.paymentEvent.count({where:{congressId:demo.id}});ok(auditCount===eventCount,'Each payment fact and its audit entry commit atomically');
 await db.congressModule.update({where:{congressId_key:{congressId:demo.id,key:'REGISTRATION'}},data:{enabled:false}});await req(endpoint(A.id),{status:403});await act(B.id,'PENDING',0,{},undefined,403);await req('/api/platform/payments/template',{status:403});await req('/api/platform/payments/statements/'+imported.id,{status:403});await post('/api/platform/payments',upload(statement),jars.platform,403);ok(await db.paymentEvent.count({where:{congressId:demo.id}})===eventCount,'Module closure blocks payment reads, imports, proof and mutation without deleting data');await db.congressModule.update({where:{congressId_key:{congressId:demo.id,key:'REGISTRATION'}},data:{enabled:true}});
 let blockedPromise;
 await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${demo.id} FOR UPDATE`;
  blockedPromise=act(B.id,'PENDING',0,{},undefined,403);blockedPromise.catch(()=>{});
  let waiting=false;for(let i=0;i<80;i++){const count=await db.$queryRaw`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%Congress%' AND pid<>pg_backend_pid()`;if(count[0].n){waiting=true;break;}await new Promise(r=>setTimeout(r,25));}
  assert.ok(waiting,'Payment mutation must reach Congress lock before module closes');
  await tx.congressModule.update({where:{congressId_key:{congressId:demo.id,key:'REGISTRATION'}},data:{enabled:false}});
 },{timeout:10000});await blockedPromise;
 ok((await db.registration.findUniqueOrThrow({where:{id:B.id}})).paymentVersion===0,'In-flight verification rechecks module after Congress lock and rolls back when disabled');
 await db.congressModule.update({where:{congressId_key:{congressId:demo.id,key:'REGISTRATION'}},data:{enabled:true}});
 // P11 identity correction increments the shared payment version. A statement
 // review taken before the email correction cannot approve stale ownership.
 await db.registration.update({where:{id:B.id},data:{email:'corrected-'+suffix+'@example.invalid',paymentVersion:{increment:1}}});
 await act(B.id,'PENDING',0,{},undefined,409);
 ok((await view(B.id)).version===1,'Identity change invalidates stale payment review without altering old bank facts');
 ok((await req('/admin/odemeler')).status===200&&(await req(`/admin/kayitlar/${A.id}`)).status===200,'Payment staff screens render after reopening the module');
 const report={checkedAt:new Date().toISOString(),localOnly:true,congressId:demo.id,slug:demo.slug,registrationId:A.id,uiRegistrationId:U.id,ambiguousRegistrationId:B.id,bankStatementId:imported.id,checks,realBankTransactions:false,realEmailDelivery:false};writeFileSync('.local/payments-check-result.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`Payments check passed: ${checks.length} checks; local synthetic evidence only.`);
} finally {await db.$disconnect();}
