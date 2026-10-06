import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {publicBooks} from '@/integrations/congress/books';
export const GET=apiRoute(async(_request,context:{params:Promise<{slug:string}>})=>NextResponse.json(await publicBooks((await context.params).slug)));
