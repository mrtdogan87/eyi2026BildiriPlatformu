import { requireContext } from '@/platform/context';
import { apiRoute } from '@/platform/http';
import { privateFile } from '@/platform/files';
import { statementTemplate } from '@/modules/payments/csv';
export const GET = apiRoute(async () => {
  await requireContext('payments.read', 'REGISTRATION');
  return privateFile(Buffer.from(statementTemplate, 'utf8'), 'text/csv; charset=utf-8', 'banka-ekstresi-sablonu.csv');
});
