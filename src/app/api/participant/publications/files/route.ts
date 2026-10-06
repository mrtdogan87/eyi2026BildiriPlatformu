import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {participantIdentity} from '@/modules/participation/session';
import {publicationUpload,savePublicationFile} from '@/integrations/congress/publications';
export const POST=apiRoute(async request=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');return NextResponse.json(await savePublicationFile(i,await publicationUpload(request)));});
