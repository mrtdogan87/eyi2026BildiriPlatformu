import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {publicationJson} from '@/modules/publications/http';
import {previewBook} from '@/integrations/congress/books';
export const POST=apiRoute(async request=>{await requireContext('publications.read','PUBLICATIONS');return NextResponse.json(await previewBook(await publicationJson(request)));});
