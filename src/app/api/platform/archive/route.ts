import {NextResponse} from 'next/server';
import {z} from 'zod';
import {apiRoute} from '@/platform/http';
import {parsed,publicationJson} from '@/modules/publications/http';
import {archiveManager,publishArchive,saveArchiveSettings,closeCongress,withdrawArchiveBook,cancelArchiveCertificate} from '@/integrations/congress/archive';
export const GET=apiRoute(async()=>NextResponse.json(await archiveManager()));
export const POST=apiRoute(async request=>{const v=parsed(z.object({action:z.enum(['PUBLISH','SETTINGS','CLOSE','WITHDRAW_BOOK','CANCEL_CERTIFICATE']),input:z.unknown()}).strict(),await publicationJson(request));const handler={PUBLISH:publishArchive,SETTINGS:saveArchiveSettings,CLOSE:closeCongress,WITHDRAW_BOOK:withdrawArchiveBook,CANCEL_CERTIFICATE:cancelArchiveCertificate}[v.action];return NextResponse.json(await handler(v.input));});
