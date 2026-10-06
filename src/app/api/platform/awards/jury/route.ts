import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {awardJson} from '@/modules/awards/http';
import {juryTasks,juryAction} from '@/integrations/congress/awards';
export const GET=apiRoute(async()=>NextResponse.json(await juryTasks()));
export const POST=apiRoute(async request=>{await requireContext('awards.perform','AWARDS');return NextResponse.json(await juryAction(await awardJson(request)));});
