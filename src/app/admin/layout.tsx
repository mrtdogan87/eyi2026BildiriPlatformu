import {hasIntervention} from '@/platform/intervention.mjs';
import {prisma} from '@/lib/prisma';
import {actorSession,availableContexts,requireContext} from '@/platform/context';
import {allows,roleLabels,type Action} from '@/platform/policy';
import {AccessError} from '@/platform/http';
import {AdminFrame} from '@/components/admin-ui/frame';
import {congressNavigation,visibleNavigation} from '@/components/admin-ui/navigation.mjs';
import '@/components/admin-ui/admin-ui.css';
export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await actorSession();if(!session)return <div className="admin-ui ui-login">{children}</div>;
  const [contexts,settings,institutions]=await Promise.all([availableContexts(session.userId,hasIntervention(session)?session.congressId!:undefined),prisma.platformSettings.findUnique({where:{id:'platform'},select:{displayName:true}}),prisma.organization.findMany({where:{id:{not:'legacy-unassigned'},...(session.user.platformAdmin?{}:{memberships:{some:{userId:session.userId,active:true,organizer:true}}})},select:{id:true,name:true},orderBy:{name:'asc'}})]);
  let context;try{context=await requireContext();}catch(error){if(!(error instanceof AccessError))throw error;}
  const modules=context?await prisma.congressModule.findMany({where:{congressId:context.congress.id,enabled:true},select:{key:true}}):[];
  const actions=context?[...new Set(congressNavigation.flatMap(group=>group.items.map(item=>item[2])))].filter(action=>allows(context.roles,action as Action)):[];
  const groups=context?visibleNavigation(actions,modules.map(m=>m.key),Boolean(context.congress.closedAt),context.personalRoles):[];
  const roles=context?.roles.map(role=>role==='PLATFORM_ADMIN'?'Platform yöneticisi':roleLabels[role])??[];
  const accountRoles=session.user.platformAdmin?['Platform yöneticisi']:institutions.length?['Kurum yöneticisi']:roles.length?roles:['Kongre üyesi'];
  return <AdminFrame user={{id:session.userId,name:session.user.name,email:session.user.email,platformAdmin:session.user.platformAdmin,accountRoles,roleScope:session.user.platformAdmin?'PLATFORM':institutions.length?'ORGANIZATION':'CONGRESS'}} displayName={settings?.displayName??'Kongre Yönetimi'} contexts={contexts.map(c=>({id:c.id,name:c.name,organization:c.organization.name}))} organizations={institutions} selected={context?.congress.id??null} groups={groups} canManageInstitutions={session.user.platformAdmin||institutions.length>0} contextName={context?.congress.name??null} institutionName={context?.congress.organization.name??null} institutionId={context?.congress.organizationId??null} roles={roles} accessSource={context?.accessSource??null} closed={Boolean(context?.congress.closedAt)} intervention={hasIntervention(session)&&context?{reason:session.interventionReason!,startedAt:session.interventionStartedAt!.toISOString()}:null}>{children}</AdminFrame>;
}
