import {apiRoute} from '@/platform/http';
import {NextResponse} from 'next/server';
import {reviewerTasks} from '@/integrations/congress/reviews';
export const GET=apiRoute(async()=>NextResponse.json(await reviewerTasks()));
