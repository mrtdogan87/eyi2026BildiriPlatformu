import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {promotionJson} from '@/modules/promotion/http';
import {promotionPreview} from '@/integrations/congress/promotion';
export const POST=apiRoute(async request=>{await requireContext('promotion.read','PROMOTION');return NextResponse.json(await promotionPreview(await promotionJson(request)));});
