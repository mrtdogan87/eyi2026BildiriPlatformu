import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync, chmodSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { loadEnv, root } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
loadEnv(); assertLocal();
const label = process.argv[2];
if (!/^P\d{2}-\d{8}-final$/.test(label ?? '')) throw new Error('Checkpoint label must be Pxx-YYYYMMDD-final');
const destination=resolve(root,'../.recovery',label);
mkdirSync(destination,{mode:0o700});chmodSync(destination,0o700);
const pg=process.env.PG_BIN ?? '/opt/homebrew/opt/postgresql@16/bin';
const env={...process.env,PGPASSWORD:decodeURIComponent(new URL(process.env.DATABASE_URL).password)};
const args=['-h','127.0.0.1','-p','55432','-U','aibildiri_v2'];
function run(command, parameters,options={}) { const result=spawnSync(command,parameters,{encoding:'utf8',env,maxBuffer:256*1024*1024,...options}); if(result.status!==0) throw new Error(`Checkpoint tool failed: ${command.split('/').at(-1)} (details withheld to protect private data)`);return result.stdout; }
const commit=run('git',['rev-parse','HEAD']).trim();const branch=run('git',['branch','--show-current']).trim();
assert.equal(run('git',['status','--porcelain']).trim(),'','Commit package changes before checkpoint');
run('git',['bundle','create',resolve(destination,'source.bundle'),'--all']);run('git',['bundle','verify',resolve(destination,'source.bundle')]);
run('git',['archive','--format=tar.gz',`--output=${resolve(destination,'source.tar.gz')}`,commit]);
copyFileSync('.env',resolve(destination,'private.env'));chmodSync(resolve(destination,'private.env'),0o600);
cpSync('.local/mail',resolve(destination,'private-mail'),{recursive:true});copyFileSync('.local/p03-accounts.json',resolve(destination,'private-accounts.json'));chmodSync(resolve(destination,'private-accounts.json'),0o600);
for(const name of ['smoke-result.json','platform-check-result.json','congress-check-result.json','preview-check-result.json','p04-panel.png','p04-setup.png','p04-form.png','site-check-result.json','p05-browser-check-result.json','p05-home.png','p05-mobile.png','p05-editor.png','cms-check-result.json','p06-browser-check-result.json','p06-audit.json','p06-cms.png','p06-editor.png','p06-media.png','p06-mobile.png','content-check-result.json','p08-browser-check-result.json','p08-records.png','p08-public.png','p08-mobile.png','p08-feedback.png','cms-starter-check-result.json','p07-browser-check-result.json','p07-pages.png','p07-import.png','p07-menu.png','p07-mobile.png']) { try { copyFileSync(resolve('.local',name),resolve(destination,name));chmodSync(resolve(destination,name),0o600); } catch(error) { if(error.code!=='ENOENT') throw error; } }
try { cpSync('.local/p07-source',resolve(destination,'private-p07-source'),{recursive:true}); } catch(error) { if(error.code!=='ENOENT') throw error; }
const dump=resolve(destination,'local.dump');run(resolve(pg,'pg_dump'),[...args,'-d','aibildiri_v2','-Fc','-f',dump]);chmodSync(dump,0o600);
const scratch=`aibildiri_v2_restore_${randomUUID().replaceAll('-','')}`;
function fingerprint(database) {
  const sql="SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename";
  const names=run(resolve(pg,'psql'),[...args,'-d',database,'-XAt','-v','ON_ERROR_STOP=1','-c',sql]).trim().split('\n');const tables={};
  for(const name of names) { assert.match(name,/^[A-Za-z_]+$/); const query=`SELECT row_to_json(t)::text FROM public."${name}" t ORDER BY row_to_json(t)::text COLLATE "C"`; const rows=run(resolve(pg,'psql'),[...args,'-d',database,'-XAt','-v','ON_ERROR_STOP=1','-c',query]); tables[name]={rows:rows ? rows.trimEnd().split('\n').length : 0,sha256:createHash('sha256').update(rows).digest('hex')}; }return tables;
}
let restoreCreated=false;
try { run(resolve(pg,'createdb'),[...args,scratch]);restoreCreated=true;run(resolve(pg,'pg_restore'),[...args,'-d',scratch,'--exit-on-error',dump]);const original=fingerprint('aibildiri_v2');const restored=fingerprint(scratch);assert.deepEqual(restored,original,'Every table fingerprint must match after full restore');const manifest={createdAt:new Date().toISOString(),commit,branch,scope:'local synthetic only',restoreVerified:true,tableFingerprints:original,privateFilesStored:true,dumpSha256:createHash('sha256').update(readFileSync(dump)).digest('hex')};writeFileSync(resolve(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});console.log(`Checkpoint ${label}: source verified, private files protected, ${Object.keys(original).length} tables restored and fingerprint matched.`); }
finally { if(restoreCreated) run(resolve(pg,'dropdb'),[...args,scratch]); }
