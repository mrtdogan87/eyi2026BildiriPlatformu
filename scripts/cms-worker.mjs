import {PrismaClient} from '@prisma/client';
import {setTimeout as pause} from 'node:timers/promises';
import {writeFile,rename} from 'node:fs/promises';
import {loadEnv} from './load-env.mjs';
import {assertEnvironment} from './environment.mjs';
import {processCmsSchedules} from '../src/modules/cms/schedule-worker.mjs';
loadEnv();assertEnvironment();
const args=process.argv.slice(2);
if(args.some(arg=>!['--once','--watch'].includes(arg))||args.length>1)throw new Error('Usage: cms-worker.mjs [--once|--watch]');
const prisma=new PrismaClient(),watch=args.includes('--watch');let stopping=false;
const heartbeatFile=process.env.CMS_WORKER_HEARTBEAT_FILE;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
try{
 do{
  try{
   const result=await processCmsSchedules({prisma});
   if(heartbeatFile){const temporary=`${heartbeatFile}.${process.pid}.tmp`;await writeFile(temporary,new Date().toISOString()+'\n',{mode:0o600});await rename(temporary,heartbeatFile);}
   if(result.results.length||!watch)console.log(JSON.stringify({worker:'cms-publication',scanned:result.scanned,outcomes:result.results.reduce((counts,r)=>({...counts,[r.status]:(counts[r.status]??0)+1}),{})}));
  }
  catch{console.error('CMS worker could not finish a batch; pending schedules remain stored.');if(!watch)process.exitCode=1;}
  if(watch&&!stopping)await pause(2000);
 }while(watch&&!stopping);
}finally{await prisma.$disconnect();}
