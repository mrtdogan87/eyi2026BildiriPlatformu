import { apiRoute } from '@/platform/http';
import { privateFile } from '@/platform/files';
import { paymentDownload } from '@/integrations/congress/payments';
export const GET = apiRoute(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  const file = await paymentDownload('statement', (await params).id);
  return privateFile(file.content, file.mime, file.name);
});
