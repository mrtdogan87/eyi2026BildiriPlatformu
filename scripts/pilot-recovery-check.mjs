import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {loadEnv} from './load-env.mjs';
import {assertLocal} from './environment.mjs';
loadEnv();assertLocal();
const pg=process.env.PG_BIN??'/opt/homebrew/opt/postgresql@16/bin',url=new URL(process.env.DATABASE_URL),env={...process.env,PGPASSWORD:decodeURIComponent(url.password)},args=['-h','127.0.0.1','-p','55432','-U','aibildiri_v2'];
const fixtures=JSON.parse(readFileSync('.local/p22-pilot-check-result.json')).fixtures,checks=[],created=[],clients=[];
const sha=value=>createHash('sha256').update(value).digest('hex');
function run(command,parameters){const r=spawnSync(command,parameters,{env,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw Error('Local recovery command failed; private output withheld');return r.stdout;}
function canonical(value){if(value instanceof Uint8Array)return {bytes:sha(value)};if(value instanceof Date)return value.toISOString();if(Array.isArray(value))return value.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
async function graph(db,f){const id=f.congressId;return canonical({
 congress:await db.congress.findUniqueOrThrow({where:{id},include:{modules:true,archiveSettings:true,archivePublications:true}}),
 paper:await db.submission.findUniqueOrThrow({where:{id:f.paperId},include:{authors:true,file:true,fileVersions:true,reviewRounds:{include:{assignments:{include:{evaluation:true}},decision:true}}}}),
 registration:await db.registration.findUniqueOrThrow({where:{id:f.registrationId},include:{paperItems:true,receipt:true,paymentEvents:true}}),
 session:await db.programSession.findUniqueOrThrow({where:{id:f.sessionId},include:{talks:true,room:true,duties:true}}),
 attendance:await db.attendanceRecord.findMany({where:{sessionId:f.sessionId},include:{events:true}}),
 certificate:await db.certificate.findUniqueOrThrow({where:{id:f.certificateId},include:{recipient:true,files:true,events:true}}),
 publication:await db.publicationItem.findUniqueOrThrow({where:{id:f.publicationItemId},include:{files:true,proofs:true,approvals:true,decisions:true}}),
 book:await db.bookOutput.findUniqueOrThrow({where:{id:f.bookId}})
});}
function client(database){const target=new URL(url);target.pathname='/'+database;const db=new PrismaClient({datasourceUrl:target.href});clients.push(db);return db;}
function restore(dump){const name='aibildiri_v2_p22_restore_'+randomUUID().replaceAll('-','');run(pg+'/createdb',[...args,name]);created.push(name);run(pg+'/pg_restore',[...args,'-d',name,'--exit-on-error',dump]);return client(name);}
const live=client('aibildiri_v2'),dump='.local/p22-rehearsal.dump';
try{
 const before=await Promise.all(fixtures.map(f=>graph(live,f)));
 run(process.execPath,['scripts/run.mjs','migrate']);
 assert.deepEqual(await Promise.all(fixtures.map(f=>graph(live,f))),before);checks.push('Additive migration deployment leaves both joined pilot records and all PDF bytes unchanged');
 run(pg+'/pg_dump',[...args,'-d','aibildiri_v2','-Fc','-f',dump]);chmodSync(dump,0o600);
 const old=restore('../.recovery/P06E-20261007-final/local.dump');assert.equal(await old.congress.count({where:{id:{in:fixtures.map(f=>f.congressId)}}}),0);checks.push('Pre-pilot backup demonstrably lacks new pilot records and cannot be used as a lossless database rollback');
 const recovered=restore(dump);
 for(const [i,f]of fixtures.entries()){
  assert.deepEqual(await graph(recovered,f),before[i]);checks.push(f.tag+': fresh restore preserves the complete submission-review-payment-program-attendance-certificate-publication-archive graph');
  const b=await recovered.bookOutput.findUniqueOrThrow({where:{id:f.bookId}});assert.equal(sha(b.content),f.bookChecksum);assert.equal(b.checksum,f.bookChecksum);
  const files=await recovered.certificateFile.findMany({where:{certificateId:f.certificateId}});assert.ok(files.length);for(const file of files)assert.equal(sha(file.pdf),file.checksum);if(f.tag==='A')assert.ok(files.some(file=>file.number===2));
  assert.equal((await recovered.registrationPaperItem.findUniqueOrThrow({where:{submissionId:f.paperId}})).registrationId,f.registrationId);assert.equal((await recovered.programTalk.findUniqueOrThrow({where:{id:f.talkId}})).submissionId,f.paperId);
  checks.push(f.tag+': exact scientific/certificate PDF checksums and the original paper identity survive restore');
 }
 assert.deepEqual(await Promise.all(fixtures.map(f=>graph(live,f))),before);checks.push('Restoration rehearsal never changes the original application database');
 writeFileSync('.local/p22-recovery-check-result.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,localOnly:true,baseline:'P06E-20261007-final',freshDumpSha256:sha(readFileSync(dump)),newRecordsRetained:true,originalDatabaseUnchanged:true,productionRollbackPerformed:false},null,2)+'\n',{mode:0o600});
 console.log('P22 local recovery rehearsal passed: '+checks.length+'; original database retained.');
}finally{for(const db of clients)await db.$disconnect();for(const name of created.reverse())run(pg+'/dropdb',[...args,name]);}
