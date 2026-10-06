import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { publicProgram } from '@/integrations/congress/program';
export const GET=apiRoute(async(_request,{params}:{params:Promise<{slug:string}>})=>NextResponse.json(await publicProgram((await params).slug)));
