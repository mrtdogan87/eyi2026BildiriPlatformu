import {prisma} from '@/lib/prisma';
import {moduleEnabled,type CongressContext} from '@/platform/context';
import {allows} from '@/platform/policy';
export async function congressDashboard(c:CongressContext){const rows:{label:string;count:number;href:string}[]=[];const id=c.congress.id;if(c.congress.closedAt)return rows;
 if(allows(c.roles,'submissions.read')&&await moduleEnabled(id,'SUBMISSIONS'))rows.push({label:'İnceleme bekleyen bildiriler',count:await prisma.submission.count({where:{congressId:id,status:{in:['SUBMITTED','UNDER_REVIEW']}}}),href:'/admin/bildiriler'});
 if(allows(c.roles,'worklist'))rows.push({label:'Açık sekreterya işleri',count:await prisma.workRequest.count({where:{congressId:id,status:{in:['NEW','IN_PROGRESS','WAITING']},OR:[{sourceModule:null},{sourceModule:{in:(await prisma.congressModule.findMany({where:{congressId:id,enabled:true},select:{key:true}})).map(m=>m.key)}}]}}),href:'/admin/is-listesi'});
 if(c.personalRoles.includes('REVIEWER')&&allows(c.roles,'reviews.perform')&&await moduleEnabled(id,'REVIEWS')&&await moduleEnabled(id,'SUBMISSIONS'))rows.push({label:'Bana atanmış hakem işleri',count:await prisma.reviewAssignment.count({where:{reviewerId:c.actor.id,status:{in:['INVITED','ACCEPTED']},round:{congressId:id,status:'OPEN',deadline:{gt:new Date()}}}}),href:'/admin/hakemlik/gorevler'});
 if(allows(c.roles,'cms')&&await moduleEnabled(id,'CMS'))rows.push({label:'İçerik sayfaları',count:await prisma.cmsPage.count({where:{congressId:id,archived:false}}),href:'/admin/cms'});
 return rows;
}
