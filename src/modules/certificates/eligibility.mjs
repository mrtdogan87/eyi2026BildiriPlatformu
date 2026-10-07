import {createHash} from 'node:crypto';
import {paymentSummary,assertLedger} from '../payments/core.ts';
import {CertificateError} from './core.ts';
import {resolveCertificateType} from './types.mjs';
import {eligibilitySourceProblems} from './attendance.ts';

export const defaultRule={enabled:false,paymentRequired:false,attendanceRequired:false};
export function fingerprint(value){const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sort(x)])):v;return createHash('sha256').update(JSON.stringify(sort(value))).digest('hex');}
export function evaluateEligibility(rule,facts){const reasons=[...facts.reasons];if(!rule.enabled)reasons.push('Bu görev için kongre belge kuralı etkin değil.');if(rule.paymentRequired&&!facts.paymentSatisfied)reasons.push('Güncel kayıt ödemesi doğrulanmalı veya açık muafiyet olmalı.');if(rule.attendanceRequired&&!facts.attendanceSatisfied)reasons.push('Güncel kaynakla eşleşen katıldı/sundu/görev yaptı yoklaması gerekli.');return {eligible:reasons.length===0,reasons};}
const email=e=>e.trim().toLowerCase();
function participationText(role,present){return role==='PRESENTER'?(present?'Bildiriyi sunmuştur.':'Bildiri sunucusu olarak programda yer almaktadır.'):role==='SPEAKER'?(present?'Konuşmasını gerçekleştirmiştir.':'Konuşmacı olarak programda yer almaktadır.'):role==='COAUTHOR'?'Kabul edilmiş bildirinin ortak yazarıdır.':present?'Etkinliğe katılmıştır.':'Kongre kaydı için düzenlenmiştir.';}

const includeSession={room:true,talks:{where:{active:true},include:{presenter:true,submission:{include:{authors:true}}}},duties:{include:{person:true}}};
export async function programSubject(db,cid,input){
  const setting=await db.congressModule.findUnique({where:{congressId_key:{congressId:cid,key:'PROGRAM'}}});
  const session=setting?.enabled?await db.programSession.findFirst({where:{id:input.sessionId,congressId:cid,active:true},include:includeSession}):null;
  const reasons=[];if(!session){return {valid:false,reasons:['Aktif program oturumu bulunamadı veya modül kapalı.'],fingerprint:'',snapshot:null,session:null};}
  let person=null,subject=null;
  if(input.kind==='PRESENTATION'){
    const talk=session.talks.find(t=>t.id===input.contextKey&&t.presenter.email===email(input.email)&&t.presenter.active);subject=talk;person=talk?.presenter;
    if(!talk)reasons.push('Bu kişi/sunum oturumda güncel sunucu değil.');
    if(talk?.submission){const enabled=await db.congressModule.findUnique({where:{congressId_key:{congressId:cid,key:'SUBMISSIONS'}}});const p=talk.submission;if(!enabled?.enabled||p.status!=='ACCEPTED'||p.correctionVersion!==talk.sourceVersion||p.reviewVersion!==talk.sourceReviewVersion||!p.authors.some(a=>a.isPresenter&&email(a.email)===email(input.email)))reasons.push('Bildiri veya program sunucusu kaynağı değişmiş.');}
  }else if(input.kind==='DUTY'){
    const duty=session.duties.find(d=>d.id===input.contextKey&&d.status==='ACCEPTED'&&d.person.active&&d.person.email===email(input.email));subject=duty;person=duty?.person;if(!duty)reasons.push('Bu kişi için kabul edilmiş güncel görev bulunamadı.');
  }else if(input.kind!=='ATTENDANCE'||input.contextKey)reasons.push('Yoklama bağlamı geçersiz.');
  const snapshot={session:{id:session.id,version:session.version,titleTr:session.titleTr,titleEn:session.titleEn,startsAt:session.startsAt.toISOString(),endsAt:session.endsAt.toISOString(),room:session.room.name,location:session.room.location,roomActive:session.room.active},kind:input.kind,email:email(input.email),contextKey:input.contextKey,person:person?{id:person.id,name:person.name,institution:person.institution,active:person.active}:null,subject:subject?input.kind==='PRESENTATION'?{id:subject.id,titleTr:subject.titleTr,titleEn:subject.titleEn,presenterId:subject.presenterId,startsAt:subject.startsAt.toISOString(),endsAt:subject.endsAt.toISOString(),submissionId:subject.submissionId,sourceVersion:subject.sourceVersion,sourceReviewVersion:subject.sourceReviewVersion}:{id:subject.id,kind:subject.kind,version:subject.version,status:subject.status}:null};
  if(!session.room.active)reasons.push('Oturum salonu etkin değil.');
  return {valid:reasons.length===0,reasons,fingerprint:fingerprint(snapshot),snapshot,session};
}

// The programme remains usable when attendance is disabled. Only an explicit
// attendance lookup may turn its current session source into attendance proof.
export async function attendanceSubject(db,cid,input){
  const setting=await db.congressModule.findUnique({where:{congressId_key:{congressId:cid,key:'ATTENDANCE'}}});
  if(!setting?.enabled)return {valid:false,reasons:['Oturum yoklaması modülü kapalı.'],fingerprint:'',snapshot:null,session:null};
  return programSubject(db,cid,input);
}

export async function congressEligibility(db,cid,selection,{ignoreCertificateModule=false}={}){
  const certificateType=await resolveCertificateType(db,cid,selection.role),baseRole=certificateType.baseRole,sourceProblems=eligibilitySourceProblems(selection,baseRole);
  if(sourceProblems.length)throw new CertificateError(sourceProblems.join(' '));
  const congress=await db.congress.findUnique({where:{id:cid},include:{modules:true}}),open=key=>!!congress?.modules.some(m=>m.key===key&&m.enabled),target=email(selection.email),reasons=[],proof={},data={recipientName:'',title:'',institution:'',eventName:congress?.name??'',datePlace:'',participation:'',talkTitle:''};
  const stored=await db.certificateRule.findUnique({where:{congressId_role:{congressId:cid,role:selection.role}}}),rule=stored?.settings??defaultRule;
  if(certificateType.custom)proof.certificateType=certificateType;
  proof.rule={id:stored?.id??null,version:stored?.version??0,settings:rule};proof.selection={...selection,email:target};proof.congressName=congress?.name??'';
  if(!ignoreCertificateModule&&!open('CERTIFICATES'))reasons.push('Belge modülü kapalı.');
  let submission=null,registration=null,session=null,subject=null,attendanceKind='ATTENDANCE',contextKey='';
  if(['PRESENTER','SPEAKER'].includes(baseRole)){
    const found=await programSubject(db,cid,{sessionId:selection.sessionId,kind:'PRESENTATION',email:target,contextKey:selection.talkId??''});reasons.push(...found.reasons);session=found.session;proof.program=found.snapshot;subject=session?.talks.find(t=>t.id===selection.talkId);submission=subject?.submission??null;attendanceKind='PRESENTATION';contextKey=selection.talkId??'';
    if(baseRole==='PRESENTER'&&!submission)reasons.push('Sunucu belgesi kabul edilmiş bildiri sunumuna bağlı olmalı.');if(baseRole==='SPEAKER'&&submission)reasons.push('Bağımsız konuşmacı yerine bildiri sunucusu görevini seçin.');
    if(subject){data.recipientName=subject.presenter.name;data.institution=subject.presenter.institution;data.talkTitle=subject.titleTr||subject.titleEn;}
  }else if(baseRole==='DUTY'){
    const found=await programSubject(db,cid,{sessionId:selection.sessionId,kind:'DUTY',email:target,contextKey:selection.dutyId??''});reasons.push(...found.reasons);session=found.session;proof.program=found.snapshot;subject=session?.duties.find(d=>d.id===selection.dutyId);attendanceKind='DUTY';contextKey=selection.dutyId??'';if(subject){data.recipientName=subject.person.name;data.institution=subject.person.institution;data.participation=subject.kind==='CHAIR'?'Oturum başkanlığı görevi için düzenlenmiştir.':'Teknik destek görevi için düzenlenmiştir.';}
  }else if(baseRole==='COAUTHOR'){
    submission=open('SUBMISSIONS')&&selection.submissionId?await db.submission.findFirst({where:{id:selection.submissionId,congressId:cid,status:'ACCEPTED'},include:{authors:true}}):null;const author=submission?.authors.find(a=>email(a.email)===target&&!a.isPresenter);if(!author)reasons.push('Kabul edilmiş bildiride bu e-posta için ortak yazar bulunamadı.');if(author){data.recipientName=author.fullName;data.title=author.title??'';data.institution=author.institution??'';}data.talkTitle=submission?.titleTr||submission?.titleEn||'';
  }
  if(['PARTICIPANT','LISTENER'].includes(baseRole)||rule.paymentRequired||selection.registrationId){
    if(open('REGISTRATION')){
      if(selection.registrationId)registration=await db.registration.findFirst({where:{id:selection.registrationId,congressId:cid},include:{paymentEvents:{orderBy:{number:'asc'}},receipt:{select:{id:true}},paperItems:{select:{submissionId:true}}}});
      else if(submission){const item=await db.registrationPaperItem.findUnique({where:{submissionId:submission.id},include:{registration:{include:{paymentEvents:{orderBy:{number:'asc'}},receipt:{select:{id:true}},paperItems:{select:{submissionId:true}}}}}});registration=item?.registration??null;}
      if(!registration||registration.congressId!==cid||(email(registration.email)!==target&&!registration.paperItems.some(p=>p.submissionId===submission?.id))){registration=null;reasons.push('Kişi/bildiriyle eşleşen kongre kaydı gerekli.');}
      if(baseRole==='LISTENER'&&registration?.kind!=='LISTENER')reasons.push('Dinleyici kaydı gerekli.');
    }else reasons.push('Kayıt modülü kapalı.');
  }
  if(submission)proof.submission={id:submission.id,status:submission.status,correctionVersion:submission.correctionVersion,reviewVersion:submission.reviewVersion,authors:submission.authors.map(a=>({email:email(a.email),name:a.fullName,presenter:a.isPresenter,institution:a.institution,title:a.title})),titleTr:submission.titleTr,titleEn:submission.titleEn};
  let paymentSatisfied=false;if(registration){let summary;try{assertLedger(registration.paymentEvents,registration.currency);summary=paymentSummary({...registration,receiptReceived:!!registration.receipt},registration.paymentEvents);paymentSatisfied=['VERIFIED','OVERPAID','EXEMPT','NO_CHARGE'].includes(summary.state);}catch{reasons.push('Ödeme geçmişi çelişkili; sekreterya kontrolü gerekli.');}
    proof.registration={id:registration.id,version:registration.paymentVersion,kind:registration.kind,email:registration.email,totalAmount:registration.totalAmount,currency:registration.currency,summary};
    if(!data.recipientName)data.recipientName=selection.recipientName??'';if(!data.institution)data.institution=selection.institution??'';
  }
  if(!data.recipientName)reasons.push('Kaynak kişi adı veya kayıt alıcısının onaylanan adı gerekli.');
  if(!session&&selection.sessionId){const found=await programSubject(db,cid,{sessionId:selection.sessionId,kind:'ATTENDANCE',email:target,contextKey:''});session=found.session;reasons.push(...found.reasons);proof.program=found.snapshot;if(baseRole==='COAUTHOR'&&!session?.talks.some(t=>t.submissionId===submission?.id&&t.submission?.status==='ACCEPTED'&&t.sourceVersion===submission?.correctionVersion&&t.sourceReviewVersion===submission?.reviewVersion))reasons.push('Seçilen oturum güncel ortak yazar bildirisiyle eşleşmiyor.');}
  let attendanceSatisfied=false;if(session){const found=await attendanceSubject(db,cid,{sessionId:session.id,kind:attendanceKind,email:target,contextKey}),record=found.valid?await db.attendanceRecord.findUnique({where:{sessionId_email_kind_contextKey:{sessionId:session.id,email:target,kind:attendanceKind,contextKey}}}):null;attendanceSatisfied=found.valid&&record?.status==='PRESENT'&&record.sourceFingerprint===found.fingerprint;
    // Yoklama sürümü yalnız yoklama şartı varsa belge hakkının kaynağıdır.
    if(rule.attendanceRequired)proof.attendance=record?{id:record.id,version:record.version,status:record.status,sourceFingerprint:record.sourceFingerprint,currentFingerprint:found.fingerprint}:null;
    data.datePlace=new Date(session.startsAt).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})+' / '+[session.room.name,session.room.location].filter(Boolean).join(' · ');if(!data.talkTitle)data.talkTitle=session.titleTr||session.titleEn;
  }
  if(rule.attendanceRequired&&!open('ATTENDANCE'))reasons.push('Oturum yoklaması modülü kapalı.');
  if(rule.attendanceRequired&&!session)reasons.push('Yoklama için uygun program oturumu seçin.');
  if(!data.participation)data.participation=participationText(baseRole,attendanceSatisfied);
  proof.data=data;const result=evaluateEligibility(rule,{reasons,paymentSatisfied,attendanceSatisfied});return {...result,fingerprint:fingerprint(proof),proof,data,paymentSatisfied,attendanceSatisfied,ruleVersion:stored?.version??0};
}

export function eligibilitySourceId(s){return fingerprint(Object.fromEntries(['email','role','sessionId','talkId','dutyId','submissionId','registrationId'].map(k=>[k,s[k]??null])));}
export async function linkedRecipientCurrent(db,recipient,options={}){
  if(recipient.source!=='CONGRESS')return true;
  const saved=recipient.sourceVersion;if(!saved?.selection||typeof saved.fingerprint!=='string')return false;
  const current=await congressEligibility(db,recipient.congressId,saved.selection,options);
  if(!current.eligible)return false;
  if(current.fingerprint===saved.fingerprint)return true;
  // Optional attendance formerly supplied display text, not a certificate condition.
  // Closing that module must not rewrite an already issued, still supported statement.
  // Reconstruct only that statement, never eligibility, and compare the entire proof.
  if(current.proof.rule?.settings?.attendanceRequired!==false)return false;
  const setting=await db.congressModule.findUnique({where:{congressId_key:{congressId:recipient.congressId,key:'ATTENDANCE'}}});
  if(setting?.enabled)return false;
  const program=current.proof.program,baseRole=current.proof.certificateType?.baseRole??saved.selection.role;
  if(!program?.session||!['PRESENTER','SPEAKER','PARTICIPANT','LISTENER'].includes(baseRole))return false;
  const record=await db.attendanceRecord.findUnique({where:{sessionId_email_kind_contextKey:{sessionId:program.session.id,email:program.email,kind:program.kind,contextKey:program.contextKey}}});
  if(record?.status!=='PRESENT'||record.sourceFingerprint!==fingerprint(program))return false;
  const historicalDisplay={...current.proof,data:{...current.data,participation:participationText(baseRole,true)}};
  return fingerprint(historicalDisplay)===saved.fingerprint;
}
