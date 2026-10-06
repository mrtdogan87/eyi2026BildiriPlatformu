import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {promotionImageUpload,savePromotionImage} from '@/integrations/congress/promotion';
export const POST=apiRoute(async request=>{await requireContext('promotion.manage','PROMOTION');return NextResponse.json(await savePromotionImage(await promotionImageUpload(request)));});
