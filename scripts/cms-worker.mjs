import {PrismaClient} from '@prisma/client';
import {setTimeout as pause} from 'node:timers/promises';
import {loadEnv} from './load-env.mjs';
import {assertLocal} from './environment.mjs';
import {processCmsSchedules} from '../src/modules/cms/schedule-worker.mjs';
loadEnv();assertLocal();
const args=process.argv.slice(2);
if(args.some(arg=>!['--once','--watch'].includes(arg))||args.length>1)throw new Error('Usage: cms-worker.mjs [--once|--watch]');
const prisma=new PrismaClient(),watch=args.includes('--watch');let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
try{
 do{
  try{const result=await processCmsSchedules({prisma});if(result.results.length||!watch)console.log(JSON.stringify({worker:'cms-publication',scanned:result.scanned,outcomes:result.results.reduce((counts,r)=>({...counts,[r.status]:(counts[r.status]??0)+1}),{})}));}
  catch{console.error('CMS worker could not finish a batch; pending schedules remain stored.');if(!watch)process.exitCode=1;}
  if(watch&&!stopping)await pause(2000);
 }while(watch&&!stopping);
}finally{await prisma.$disconnect();}
