import {apiRoute,AccessError} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {exportArchive} from '@/integrations/congress/archive';
export const GET=apiRoute(async request=>{const input=new URL(request.url).searchParams.get('input');if(!input||input.length>16000)throw new AccessError(400,'Dışa aktarma seçimi gerekli.');let value:unknown;try{value=JSON.parse(input);}catch{throw new AccessError(400,'Geçerli seçim gerekli.');}return privateFile(await exportArchive(value),'application/zip','kongre-disa-aktarma.zip');});
