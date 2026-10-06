import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { reviewJson, parsed } from '@/modules/reviews/http';
import { z } from 'zod';
import {reviewerDetail,respondInvitation,saveEvaluation} from '@/integrations/congress/reviews';
type Props={params:Promise<{id:string}>};
export const GET=apiRoute(async(_:Request,{params}:Props)=>NextResponse.json(await reviewerDetail((await params).id)));
export const POST=apiRoute(async(request:Request,{params}:Props)=>{await requireContext('reviews.perform','REVIEWS');const {action,input}=parsed(z.object({action:z.enum(['RESPOND','EVALUATE']),input:z.unknown()}).strict(),await reviewJson(request));return NextResponse.json(action==='RESPOND'?await respondInvitation((await params).id,input):await saveEvaluation((await params).id,input));});
