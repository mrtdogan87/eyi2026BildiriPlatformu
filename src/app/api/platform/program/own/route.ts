import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { platformProgram } from '@/integrations/congress/program';
export const GET=apiRoute(async()=>NextResponse.json(await platformProgram()));
