import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {participantIdentity} from '@/modules/participation/session';
import {awardUpload,saveAwardFile} from '@/integrations/congress/award-personal';
export const POST=apiRoute(async request=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');return NextResponse.json(await saveAwardFile(i,await awardUpload(request)));});
