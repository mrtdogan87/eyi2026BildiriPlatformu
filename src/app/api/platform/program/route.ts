import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { programJson } from '@/modules/program/http';
import { programManager, manageProgram } from '@/integrations/congress/program';
export const GET=apiRoute(async()=>NextResponse.json(await programManager()));
export const POST=apiRoute(async request=>{await requireContext('program.manage','PROGRAM');return NextResponse.json(await manageProgram(await programJson(request)));});
