import {apiRoute} from '@/platform/http';
import {participantIdentity} from '@/modules/participation/session';
import {privateFile} from '@/platform/files';
import {publicationFile} from '@/integrations/congress/publications';
export const GET=apiRoute(async(request,context:{params:Promise<{id:string}>})=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');const file=await publicationFile((await context.params).id,i);return privateFile(file.content,file.mime,file.name);});
