import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {participantIdentity} from '@/modules/participation/session';
import {publicationJson} from '@/modules/publications/http';
import {personalPublications,personalPublicationAction} from '@/integrations/congress/publications';
export const GET=apiRoute(async request=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');return NextResponse.json(await personalPublications(i));});
export const POST=apiRoute(async request=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');return NextResponse.json(await personalPublicationAction(i,await publicationJson(request)));});
