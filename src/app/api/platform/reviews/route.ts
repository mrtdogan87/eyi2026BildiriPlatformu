import {apiRoute} from '@/platform/http';
import {NextResponse} from 'next/server';
import {reviewList} from '@/integrations/congress/reviews';
export const GET=apiRoute(async()=>NextResponse.json(await reviewList()));
