import { NextResponse } from 'next/server';
import { apiRoute, AccessError } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { reviewForm, reviewPayload, reviewBinary, parsed } from '@/modules/reviews/http';
import { z } from 'zod';
import {saveEvaluation,cancelAssignment} from '@/integrations/congress/reviews';
export const POST=apiRoute(async(request:Request,{params}:{params:Promise<{id:string}>})=>{await requireContext('reviews.manage','REVIEWS');const form=await reviewForm(request);const {action,input}=parsed(z.object({action:z.enum(['IMPORT','CANCEL']),input:z.unknown()}).strict(),reviewPayload(form));const {id}=await params;if(action==='CANCEL'){if(form.has('file'))throw new AccessError(400,'İptal işleminde dosya kullanılmaz.');return NextResponse.json(await cancelAssignment(id,input));}return NextResponse.json(await saveEvaluation(id,input,await reviewBinary(form.get('file')),true));});
