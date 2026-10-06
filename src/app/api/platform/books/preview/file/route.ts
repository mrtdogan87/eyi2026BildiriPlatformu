import {apiRoute,AccessError} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {previewBookFile} from '@/integrations/congress/books';
export const GET=apiRoute(async request=>{const input=new URL(request.url).searchParams.get('input');if(!input||input.length>16000)throw new AccessError(400,'Geçerli önizleme seçimi gerekli.');let value:unknown;try{value=JSON.parse(input);}catch{throw new AccessError(400,'Önizleme seçimi okunamadı.');}const f=await previewBookFile(value);return privateFile(f.content,f.mime,f.name);});
