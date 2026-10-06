import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {publicationJson} from '@/modules/publications/http';
import {personalPublications,personalPublicationAction} from '@/integrations/congress/publications';
export const GET=apiRoute(async()=>{const c=await requireContext('own','PUBLICATIONS'),i={congressId:c.congress.id,email:c.actor.email,context:c};return NextResponse.json(await personalPublications(i));});
export const POST=apiRoute(async request=>{const c=await requireContext('own','PUBLICATIONS'),i={congressId:c.congress.id,email:c.actor.email,context:c};return NextResponse.json(await personalPublicationAction(i,await publicationJson(request)));});
