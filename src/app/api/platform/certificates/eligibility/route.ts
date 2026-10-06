import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {certificateJson} from '@/modules/certificates/http';
import {eligibilityManager,manageEligibility} from '@/integrations/congress/attendance';
export const GET=apiRoute(async()=>NextResponse.json(await eligibilityManager()));
export const POST=apiRoute(async request=>{await requireContext('certificates.read','CERTIFICATES');return NextResponse.json(await manageEligibility(await certificateJson(request)));});
