import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {publicationJson} from '@/modules/publications/http';
import {previewArchive} from '@/integrations/congress/archive';
export const POST=apiRoute(async request=>NextResponse.json(await previewArchive(await publicationJson(request))));
