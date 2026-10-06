import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {awardUpload,saveAwardFile} from '@/integrations/congress/award-personal';
export const POST=apiRoute(async request=>{const c=await requireContext('awards.manage','AWARDS');return NextResponse.json(await saveAwardFile({congressId:c.congress.id,email:c.actor.email},await awardUpload(request),c));});
