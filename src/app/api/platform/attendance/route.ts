import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {certificateJson} from '@/modules/certificates/http';
import {attendanceManager,manageAttendance} from '@/integrations/congress/attendance';
export const GET=apiRoute(async()=>NextResponse.json(await attendanceManager()));
export const POST=apiRoute(async request=>{await requireContext('attendance.perform','PROGRAM');return NextResponse.json(await manageAttendance(await certificateJson(request)));});
