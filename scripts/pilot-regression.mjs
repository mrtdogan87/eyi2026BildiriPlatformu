import {spawn} from 'node:child_process';
import {openSync,closeSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {loadEnv} from './load-env.mjs';import {assertLocal} from './environment.mjs';
loadEnv();assertLocal();rmSync('.local/p22-regression-result.json',{force:true});
const controlled=[['publications-check','p19-publications-check-result'],['promotion-check','p18-promotion-check-result'],['awards-check','p17-awards-check-result'],['attendance-check','attendance-check-result'],['certificates-offline-check','certificates-offline-check-result'],['certificates-check','certificates-check-result'],['activities-check','activities-check-result'],['program-check','program-check-result'],['reviews-check','reviews-check-result'],['payments-check','payments-check-result'],['revisions-check','revisions-check-result'],['participation-check','participation-check-result'],['communication-check','communication-check-result'],['archive-check','p21-archive-check-result']];
const foundation=[['smoke','smoke-result'],['platform-check','platform-check-result'],['congress-check','congress-check-result'],['site-check','site-check-result'],['cms-check','cms-check-result'],['cms-starter-check','cms-starter-check-result'],['content-check','content-check-result'],['cms-language-check','p06e-language-check-result'],['preview-check','preview-check-result']];
const results=[];let unitChecks=0;
async function run(name,args){const fd=openSync('.local/p22-'+name+'.log','w',0o600);try{const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{env:process.env,stdio:['ignore',fd,fd]});c.once('error',reject);c.once('exit',resolve);});if(code!==0)throw new Error(`${name} failed; inspect private .local/p22-${name}.log`);}finally{closeSync(fd);}}
async function suite(script,evidence){await run(script,['scripts/'+script+'.mjs']);const d=JSON.parse(readFileSync('.local/'+evidence+'.json'));results.push({suite:script,checks:d.checks.length,passed:true});writeFileSync('.local/p22-regression-progress.json',JSON.stringify({checkedAt:new Date().toISOString(),unitChecks,suites:results,allPassed:false},null,2)+'\n',{mode:0o600});console.log(script+': '+d.checks.length+' passed.');}
let worker;
try{
 await run('unit',['--test',...readdirSync('scripts').filter(f=>f.endsWith('.test.mjs')).map(f=>'scripts/'+f)]);const unitLog=readFileSync('.local/p22-unit.log','utf8');unitChecks=Number(/(?:ℹ pass|# pass) (\d+)/.exec(unitLog)?.[1]);if(!unitChecks)throw Error('Unit report unavailable');console.log('Unit: '+unitChecks+' passed.');
 for(const s of controlled)await suite(...s);
 const books=JSON.parse(readFileSync('.local/p20-books-check-result.json'));results.push({suite:'books-check (archive preparation)',checks:books.checks.length,passed:true});
 worker=spawn(process.execPath,['scripts/mail-worker.mjs','--watch'],{env:process.env,stdio:'ignore'});
 for(const s of foundation)await suite(...s);
 const preview=results.find(s=>s.suite==='preview-check').checks,httpChecks=results.filter(s=>s.suite!=='preview-check').reduce((n,s)=>n+s.checks,0);
 writeFileSync('.local/p22-regression-result.json',JSON.stringify({checkedAt:new Date().toISOString(),unitChecks,httpChecks,automaticChecks:unitChecks+httpChecks,previewChecks:preview,suites:results,allPassed:true,realEmailDelivery:false},null,2)+'\n',{mode:0o600});console.log(`Full regression: ${unitChecks+httpChecks} checks plus ${preview} preview checks.`);
}finally{if(worker){const exited=new Promise(resolve=>worker.once('exit',resolve));worker.kill('SIGTERM');await exited;}}
