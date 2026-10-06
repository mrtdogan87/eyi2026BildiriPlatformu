import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {publicationJson} from '@/modules/publications/http';
import {ownArchiveBooks,withdrawOwnArchiveBook} from '@/integrations/congress/archive';
export const GET=apiRoute(async()=>NextResponse.json(await ownArchiveBooks()));
export const POST=apiRoute(async request=>NextResponse.json(await withdrawOwnArchiveBook(await publicationJson(request))));
