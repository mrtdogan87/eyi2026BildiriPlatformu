import { NextResponse } from 'next/server';
import { apiRoute, AccessError } from '@/platform/http';
import { participantIdentity } from '@/modules/participation/session';
import { onlineProgram } from '@/integrations/congress/program';
export const GET=apiRoute(async(_request,{params}:{params:Promise<{slug:string;id:string}>})=>{const {slug:congressSlug,id}=await params;try{return NextResponse.json(await onlineProgram(congressSlug,id));}catch(e){if(!(e instanceof AccessError)||e.status!==401)throw e;const identity=await participantIdentity(congressSlug);return NextResponse.json(await onlineProgram(congressSlug,id,identity));}});
