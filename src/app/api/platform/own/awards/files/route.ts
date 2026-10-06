import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {awardUpload,saveAwardFile} from '@/integrations/congress/award-personal';
export const POST=apiRoute(async request=>{const c=await requireContext('own','AWARDS'),i={congressId:c.congress.id,email:c.actor.email,context:c};return NextResponse.json(await saveAwardFile(i,await awardUpload(request)));});
