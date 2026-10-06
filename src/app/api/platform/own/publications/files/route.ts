import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {publicationUpload,savePublicationFile} from '@/integrations/congress/publications';
export const POST=apiRoute(async request=>{const c=await requireContext('own','PUBLICATIONS'),i={congressId:c.congress.id,email:c.actor.email,context:c};return NextResponse.json(await savePublicationFile(i,await publicationUpload(request)));});
