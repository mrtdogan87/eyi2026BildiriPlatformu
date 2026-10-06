import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {promotionJson} from '@/modules/promotion/http';
import {promotionManager,managePromotion} from '@/integrations/congress/promotion';
export const GET=apiRoute(async()=>NextResponse.json(await promotionManager()));
export const POST=apiRoute(async request=>{await requireContext('promotion.manage','PROMOTION');return NextResponse.json(await managePromotion(await promotionJson(request)));});
