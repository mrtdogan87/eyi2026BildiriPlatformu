import { apiRoute } from '@/platform/http';
import { privateFile } from '@/platform/files';
import { paymentDownload } from '@/integrations/congress/payments';
export const GET = apiRoute(async (_: Request, { params }: { params: Promise<{ id: string; eventId: string }> }) => {
  const { id, eventId } = await params, file = await paymentDownload('evidence', eventId, id);
  return privateFile(file.content, file.mime, file.name);
});
