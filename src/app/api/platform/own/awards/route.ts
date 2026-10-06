import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {awardJson} from '@/modules/awards/http';
import {personalAwards,personalAwardAction} from '@/integrations/congress/award-personal';
export const GET=apiRoute(async()=>{const c=await requireContext('own','AWARDS'),i={congressId:c.congress.id,email:c.actor.email,context:c};return NextResponse.json(await personalAwards(i));});
export const POST=apiRoute(async request=>{const c=await requireContext('own','AWARDS'),i={congressId:c.congress.id,email:c.actor.email,context:c};return NextResponse.json(await personalAwardAction(i,await awardJson(request)));});
