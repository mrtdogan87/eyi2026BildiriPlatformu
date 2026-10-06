import { apiRoute, AccessError } from '@/platform/http';
import { privateFile } from '@/platform/files';
import { revisionDownload } from '@/integrations/congress/revisions';
export const GET = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) => {
  const { id, entryId } = await params, type = new URL(request.url).searchParams.get('type');
  if (type !== 'file' && type !== 'evidence' && type !== 'proposal') throw new AccessError(400, 'Dosya türü gerekli.');
  const file = await revisionDownload(id, type, entryId); return privateFile(file.content, file.mimeType, file.originalName);
});
