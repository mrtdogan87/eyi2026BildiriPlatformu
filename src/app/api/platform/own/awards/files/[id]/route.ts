import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {privateFile} from '@/platform/files';
import {awardFile} from '@/integrations/congress/award-personal';
export const GET=apiRoute(async(_request,context:{params:Promise<{id:string}>})=>{const c=await requireContext('own','AWARDS'),i={congressId:c.congress.id,email:c.actor.email,context:c};const f=await awardFile((await context.params).id,i);return privateFile(f.content,f.mime,f.name);});
