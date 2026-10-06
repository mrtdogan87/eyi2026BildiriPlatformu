import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {awardJson} from '@/modules/awards/http';
import {awardManager,manageAwards} from '@/integrations/congress/awards';
export const GET=apiRoute(async()=>NextResponse.json(await awardManager()));
export const POST=apiRoute(async request=>{await requireContext('awards.manage','AWARDS');return NextResponse.json(await manageAwards(await awardJson(request)));});
