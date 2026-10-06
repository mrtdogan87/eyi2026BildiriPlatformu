import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { programJson } from '@/modules/program/http';
import { respondProgramDuty } from '@/integrations/congress/program';
export const POST=apiRoute(async(request,{params}:{params:Promise<{id:string}>})=>{await requireContext('own','PROGRAM');return NextResponse.json(await respondProgramDuty((await params).id,await programJson(request)));});
