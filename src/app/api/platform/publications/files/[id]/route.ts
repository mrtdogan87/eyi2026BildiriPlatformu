import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {privateFile} from '@/platform/files';
import {publicationFile} from '@/integrations/congress/publications';
export const GET=apiRoute(async(request,context:{params:Promise<{id:string}>})=>{const c=await requireContext('publications.read','PUBLICATIONS'),i={congressId:c.congress.id,email:c.actor.email,context:c};const file=await publicationFile((await context.params).id,i,c);return privateFile(file.content,file.mime,file.name);});
