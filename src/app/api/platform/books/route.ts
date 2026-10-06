import {NextResponse} from 'next/server';
import {z} from 'zod';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {publicationJson,parsed} from '@/modules/publications/http';
import {bookManager,generateBook,publishBook} from '@/integrations/congress/books';
export const GET=apiRoute(async()=>NextResponse.json(await bookManager()));
export const POST=apiRoute(async request=>{await requireContext('publications.manage','PUBLICATIONS');const v=parsed(z.object({action:z.enum(['GENERATE','PUBLISH']),input:z.unknown()}).strict(),await publicationJson(request));return NextResponse.json(v.action==='GENERATE'?await generateBook(v.input):await publishBook(v.input));});
