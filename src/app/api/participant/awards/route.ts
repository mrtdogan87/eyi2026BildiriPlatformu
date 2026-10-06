import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {participantIdentity} from '@/modules/participation/session';
import {awardJson} from '@/modules/awards/http';
import {personalAwards,personalAwardAction} from '@/integrations/congress/award-personal';
export const GET=apiRoute(async request=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');return NextResponse.json(await personalAwards(i));});
export const POST=apiRoute(async request=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??'');return NextResponse.json(await personalAwardAction(i,await awardJson(request)));});
