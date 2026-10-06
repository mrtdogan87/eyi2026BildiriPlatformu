import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { reviewJson, parsed } from '@/modules/reviews/http';
import { z } from 'zod';
import {inviteReviewer,decideRound,manageRound} from '@/integrations/congress/reviews';
type Props={params:Promise<{id:string}>};
export const POST=apiRoute(async(request:Request,{params}:Props)=>{await requireContext('reviews.manage','REVIEWS');const {action,input}=parsed(z.object({action:z.enum(['INVITE','DECISION','CANCEL','DEADLINE']),input:z.unknown()}).strict(),await reviewJson(request));const {id}=await params;return NextResponse.json(action==='INVITE'?await inviteReviewer(id,input):action==='DECISION'?await decideRound(id,input):await manageRound(id,action==='CANCEL'?'cancel':'deadline',input));});
