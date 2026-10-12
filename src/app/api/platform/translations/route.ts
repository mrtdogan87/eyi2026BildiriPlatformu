import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {translationOverview} from '@/modules/translations/service';
export const GET=apiRoute(async()=>NextResponse.json(await translationOverview()));
