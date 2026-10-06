import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRoute } from '@/platform/http';
import { participantIdentity } from '@/modules/participation/session';
import { programJson, parsed } from '@/modules/program/http';
import { respondProgramDuty } from '@/integrations/congress/program';
export const POST=apiRoute(async(request,{params}:{params:Promise<{id:string}>})=>{const body=parsed(z.object({congressSlug:z.string().min(1).max(120),input:z.unknown()}).strict(),await programJson(request));const identity=await participantIdentity(body.congressSlug);return NextResponse.json(await respondProgramDuty((await params).id,body.input,identity));});
