import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { reviewForm, reviewPayload, reviewBinary } from '@/modules/reviews/http';
import {reviewDetail,createRound} from '@/integrations/congress/reviews';
type Props={params:Promise<{id:string}>};
export const GET=apiRoute(async(_:Request,{params}:Props)=>NextResponse.json(await reviewDetail((await params).id)));
export const POST=apiRoute(async(request:Request,{params}:Props)=>{await requireContext('reviews.manage','REVIEWS');const form=await reviewForm(request);return NextResponse.json(await createRound((await params).id,reviewPayload(form),await reviewBinary(form.get('file'))));});
