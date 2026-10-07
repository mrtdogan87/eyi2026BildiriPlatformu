import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,writeFileSync,createReadStream} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PrismaClient} from '@prisma/client';
import {loadEnv} from './load-env.mjs';import {assertLocal} from './environment.mjs';
const expectedInventory={migrations:36,tables:99};
const historicalSource='1e311a8',historicalManifest='../.recovery/P06E-20261007-final/manifest.json';
export function schemaTableNames(schema){
 const names=[...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(([,name,body])=>body.match(/@@map\("([^"\n]+)"\)/)?.[1]??name);
 assert.ok(names.length,'Prisma schema must contain model tables');
 assert.equal(new Set(names).size,names.length,'Prisma table names must be unique');
 return [...names,'_prisma_migrations'].sort();
}
export function validateCheckpoint(manifest,{commit,tableNames,dumpSha256,liveFingerprints}){
 assert.equal(manifest.restoreVerified,true,'Checkpoint must have completed a full restore verification');
 assert.equal(manifest.privateFilesStored,true,'Checkpoint must preserve protected runtime files');
 assert.equal(manifest.commit,commit,'Checkpoint source must match the current application commit');
 assert.ok(Number.isFinite(Date.parse(manifest.createdAt)),'Checkpoint creation time is required');
 assert.deepEqual(Object.keys(manifest.tableFingerprints??{}).sort(),[...tableNames].sort(),'Checkpoint must cover every current table');
 for(const item of Object.values(manifest.tableFingerprints)){
  assert.ok(Number.isInteger(item.rows)&&item.rows>=0,'Checkpoint row counts must be nonnegative integers');
  assert.match(item.sha256,/^[a-f0-9]{64}$/,'Checkpoint table fingerprints must be SHA-256 values');
 }
 assert.equal(manifest.dumpSha256,dumpSha256,'Checkpoint dump bytes must match their verified manifest');
 assert.deepEqual(manifest.tableFingerprints,liveFingerprints,'Current table contents changed since checkpoint; create a fresh verified checkpoint');
 return {status:'verified',commit:manifest.commit,createdAt:manifest.createdAt,tables:tableNames.length,dumpSha256,fullRestoreVerified:true,liveFingerprintsMatched:true};
}
async function fileHash(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function liveTableFingerprints(tableNames){
 const url=new URL(process.env.DATABASE_URL),pg=process.env.PG_BIN??'/opt/homebrew/opt/postgresql@16/bin',env={...process.env,PGPASSWORD:decodeURIComponent(url.password)},tables={};
 for(const name of tableNames){
  assert.match(name,/^[A-Za-z_]+$/,'Unexpected public table name');
  const query=`SELECT row_to_json(t)::text FROM public."${name}" t ORDER BY row_to_json(t)::text COLLATE "C"`;
  // Same sorted bytes as checkpoint.mjs; stream to avoid retaining private rows
  // or large PDF/media values in memory, logs or temporary files.
  tables[name]=await new Promise((resolveFingerprint,reject)=>{
   const hash=createHash('sha256');let rows=0;
   const child=spawn(resolve(pg,'psql'),['-h',url.hostname,'-p',url.port,'-U',decodeURIComponent(url.username),'-d',decodeURIComponent(url.pathname.slice(1)),'-XAt','-v','ON_ERROR_STOP=1','-c',query],{env,stdio:['ignore','pipe','ignore']});
   child.stdout.on('data',chunk=>{hash.update(chunk);for(let start=0,newline;(newline=chunk.indexOf(10,start))!==-1;start=newline+1)rows++;});
   child.on('error',()=>reject(new Error('Read-only checkpoint comparison failed; private connection details withheld')));
   child.on('close',code=>code===0?resolveFingerprint({rows,sha256:hash.digest('hex')}):reject(new Error('Read-only checkpoint comparison failed; private database output withheld')));
  });
 }
 return tables;
}
async function main(){
 const args=process.argv.slice(2);assert.ok(args.length===0||(args.length===2&&args[0]==='--checkpoint'),'Usage: node scripts/pilot-preflight.mjs [--checkpoint path/to/manifest.json]');
 const checkpointPath=args[1]?resolve(args[1]):null;
 loadEnv();assertLocal();const db=new PrismaClient(),checks=[],ok=(v,label)=>{assert.ok(v,label);checks.push(label);};
try{
 const health=await fetch(process.env.APP_BASE_URL+'/api/health');ok(health.status===200&&JSON.stringify(await health.json())===JSON.stringify({status:'ok'})&&health.headers.get('cache-control')==='no-store','HTTP readiness proves database connection with no exposed configuration');
 const listener=execFileSync('/usr/sbin/lsof',['-nP','-iTCP:3100','-sTCP:LISTEN'],{encoding:'utf8'});ok(listener.includes('127.0.0.1:3100')&&!listener.includes('*:3100'),'Local application listens only on IPv4 loopback');
 const applied=await db.$queryRaw`SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
 const migrations=readdirSync('prisma/migrations').filter(n=>statSync('prisma/migrations/'+n).isDirectory()).sort();assert.deepEqual(applied.map(row=>row.migration_name),migrations,'Applied migration names must exactly match the current source');for(const row of applied)assert.equal(row.checksum,createHash('sha256').update(readFileSync('prisma/migrations/'+row.migration_name+'/migration.sql')).digest('hex'));checks.push('Every applied migration matches its current source SQL name and checksum');
 const diff=execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-schema-datamodel','prisma/schema.prisma','--to-url',process.env.DATABASE_URL,'--exit-code'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});ok(diff.includes('No difference detected'),'Live local database has no Prisma schema drift');
 const tables=await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`,tableNames=tables.map(t=>t.tablename).sort(),currentSchema=readFileSync('prisma/schema.prisma','utf8');assert.deepEqual(tableNames,schemaTableNames(currentSchema),'Live table names must exactly match Prisma models and migration history');ok(tables.length===expectedInventory.tables&&applied.length===expectedInventory.migrations,'Expected 36 migrations and 99 tables include certificate types and scheduled CMS publication');
 const source=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),accounts=JSON.parse(readFileSync('.local/p03-accounts.json'));
 const privateValues=Object.entries(process.env).filter(([k,v])=>/SECRET|PASSWORD|SMTP_PASS|RESEND_API_KEY/.test(k)&&v&&v.length>=12).map(([,v])=>v);privateValues.push(decodeURIComponent(new URL(process.env.DATABASE_URL).password));for(const a of Object.values(accounts))if(a.password)privateValues.push(a.password);
 let scanned=0;const inspect=p=>{scanned++;const text=readFileSync(p).toString('utf8');for(const value of privateValues)assert.ok(!text.includes(value),'Private credential detected; value withheld');};for(const p of source)inspect(p);
 const walk=dir=>{for(const n of readdirSync(dir)){const p=dir+'/'+n;if(statSync(p).isDirectory())walk(p);else inspect(p);}};walk('.next/static');checks.push('Tracked sources and generated client assets contain no private runtime credentials');
 ok(!readdirSync('.next/standalone').some(n=>n.startsWith('.env')),'Standalone build contains no environment file');
 ok(process.env.MAIL_MODE==='capture'&&!['SMTP_HOST','SMTP_PASS','RESEND_API_KEY'].some(k=>process.env[k]),'Local worker is configured for capture only without delivery credentials');
 const previous=JSON.parse(readFileSync(historicalManifest)),priorSchema=execFileSync('git',['show',historicalSource+':prisma/schema.prisma'],{encoding:'utf8'});assert.deepEqual(Object.keys(previous.tableFingerprints??{}).sort(),schemaTableNames(priorSchema));ok(previous.restoreVerified===true&&Object.keys(previous.tableFingerprints).length===97,'Historical P06-E1 recovery point retains its verified 97-table baseline; it is not a current recovery point');
 for(const file of ['deploy/Dockerfile.preview','deploy/compose.preview.yml','deploy/preview.env.example','docs/DENEME_ORTAMI.md'])assert.ok(statSync(file).isFile());checks.push('Separate preview deployment sources are retained without touching existing live application');
 const schemaChanged=priorSchema!==currentSchema,currentCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 let recovery={status:'pending',reason:'Pass --checkpoint with a fresh current-source manifest after full checkpoint restore verification.',fullRestoreVerified:false,liveFingerprintsMatched:false};
 if(checkpointPath){
  assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','Commit current source before validating its checkpoint');
  const manifest=JSON.parse(readFileSync(checkpointPath)),dumpSha256=await fileHash(resolve(dirname(checkpointPath),'local.dump')),liveFingerprints=await liveTableFingerprints(tableNames);
  recovery={...validateCheckpoint(manifest,{commit:currentCommit,tableNames,dumpSha256,liveFingerprints}),manifest:checkpointPath};
  checks.push('Current committed source, full-restored dump bytes and every live table fingerprint match the supplied checkpoint');
 }
 const report={checkedAt:new Date().toISOString(),checks,migrations:applied.length,tables:tables.length,sourceAndClientFilesScanned:scanned,localOnly:true,mailMode:'capture',externalDeployment:{performed:false,domainSelected:false,tlsVerified:false,realEmailVerified:false,dockerImageExecuted:false},currentCommit,previousSource:historicalSource,historicalRecovery:{manifest:historicalManifest,tables:97,restoreVerified:true,currentRecovery:false},schemaChangedFromHistoricalSource:schemaChanged,sourceOnlyRollbackSupported:false,recoveryStrategy:'FORWARD_MIGRATION_THEN_VERIFIED_FULL_CHECKPOINT',recoveryGuidance:'The earlier binary does not know the added enum values and models. Do not treat source-only rollback or the historical database dump as lossless recovery. Apply forward migrations and verify a fresh checkpoint of matching source, protected runtime files and the full database; repeat after subsequent writes.',recovery,recoveryReady:recovery.status==='verified'};writeFileSync('.local/p22-preflight-result.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`P22 local preflight checks passed: ${checks.length}; current recovery ${recovery.status}. Source-only rollback is unsupported; external deployment remains unperformed.`);
}finally{await db.$disconnect();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
