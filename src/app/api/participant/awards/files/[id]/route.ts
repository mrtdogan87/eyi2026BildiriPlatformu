import {apiRoute} from '@/platform/http';
import {participantIdentity} from '@/modules/participation/session';
import {privateFile} from '@/platform/files';
import {awardFile} from '@/integrations/congress/award-personal';
export const GET=apiRoute(async(request,context:{params:Promise<{id:string}>})=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');const f=await awardFile((await context.params).id,i);return privateFile(f.content,f.mime,f.name);});
