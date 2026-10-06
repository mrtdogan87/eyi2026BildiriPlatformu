import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {publicationJson} from '@/modules/publications/http';
import {publicationManager,managePublication} from '@/integrations/congress/publications';
export const GET=apiRoute(async()=>NextResponse.json(await publicationManager()));
export const POST=apiRoute(async request=>{await requireContext('publications.manage','PUBLICATIONS');return NextResponse.json(await managePublication(await publicationJson(request)));});
