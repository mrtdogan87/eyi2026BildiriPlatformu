import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {loadEnv} from './load-env.mjs';import {assertLocal} from './environment.mjs';
loadEnv();assertLocal();const db=new PrismaClient(),checks=[],ok=(v,label)=>{assert.ok(v,label);checks.push(label);};
try{
 const health=await fetch(process.env.APP_BASE_URL+'/api/health');ok(health.status===200&&JSON.stringify(await health.json())===JSON.stringify({status:'ok'})&&health.headers.get('cache-control')==='no-store','HTTP readiness proves database connection with no exposed configuration');
 const listener=execFileSync('/usr/sbin/lsof',['-nP','-iTCP:3100','-sTCP:LISTEN'],{encoding:'utf8'});ok(listener.includes('127.0.0.1:3100')&&!listener.includes('*:3100'),'Local application listens only on IPv4 loopback');
 const applied=await db.$queryRaw`SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
 const migrations=readdirSync('prisma/migrations').filter(n=>statSync('prisma/migrations/'+n).isDirectory());assert.equal(applied.length,migrations.length);for(const row of applied)assert.equal(row.checksum,createHash('sha256').update(readFileSync('prisma/migrations/'+row.migration_name+'/migration.sql')).digest('hex'));checks.push('Every applied migration matches its committed SQL checksum');
 const diff=execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-schema-datamodel','prisma/schema.prisma','--to-url',process.env.DATABASE_URL,'--exit-code'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});ok(diff.includes('No difference detected'),'Live local database has no Prisma schema drift');
 const tables=await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;ok(tables.length===97&&applied.length===33,'Expected 33 additive migrations and 97 tables are present');
 const source=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),accounts=JSON.parse(readFileSync('.local/p03-accounts.json'));
 const privateValues=Object.entries(process.env).filter(([k,v])=>/SECRET|PASSWORD|SMTP_PASS|RESEND_API_KEY/.test(k)&&v&&v.length>=12).map(([,v])=>v);privateValues.push(decodeURIComponent(new URL(process.env.DATABASE_URL).password));for(const a of Object.values(accounts))if(a.password)privateValues.push(a.password);
 let scanned=0;const inspect=p=>{scanned++;const text=readFileSync(p).toString('utf8');for(const value of privateValues)assert.ok(!text.includes(value),'Private credential detected; value withheld');};for(const p of source)inspect(p);
 const walk=dir=>{for(const n of readdirSync(dir)){const p=dir+'/'+n;if(statSync(p).isDirectory())walk(p);else inspect(p);}};walk('.next/static');checks.push('Tracked sources and generated client assets contain no private runtime credentials');
 ok(!readdirSync('.next/standalone').some(n=>n.startsWith('.env')),'Standalone build contains no environment file');
 ok(process.env.MAIL_MODE==='capture'&&!['SMTP_HOST','SMTP_PASS','RESEND_API_KEY'].some(k=>process.env[k]),'Local worker is configured for capture only without delivery credentials');
 const previous=JSON.parse(readFileSync('../.recovery/P06E-20261007-final/manifest.json'));ok(previous.restoreVerified&&Object.keys(previous.tableFingerprints).length===97,'Pre-pilot recovery point was actually restored and fingerprint-verified');
 for(const file of ['deploy/Dockerfile.preview','deploy/compose.preview.yml','deploy/preview.env.example','docs/DENEME_ORTAMI.md'])assert.ok(statSync(file).isFile());checks.push('Separate preview deployment sources are retained without touching existing live application');
 const priorSchema=execFileSync('git',['show','1e311a8:prisma/schema.prisma'],{encoding:'utf8'});ok(priorSchema===readFileSync('prisma/schema.prisma','utf8'),'Previous application source and current pilot have an identical database schema for source rollback');
 const report={checkedAt:new Date().toISOString(),checks,migrations:applied.length,tables:tables.length,sourceAndClientFilesScanned:scanned,localOnly:true,mailMode:'capture',externalDeployment:{performed:false,domainSelected:false,tlsVerified:false,realEmailVerified:false,dockerImageExecuted:false},previousSource:'1e311a8'};writeFileSync('.local/p22-preflight-result.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(`P22 local preflight passed: ${checks.length}; external deployment remains unperformed.`);
}finally{await db.$disconnect();}
