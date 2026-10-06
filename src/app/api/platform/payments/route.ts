import { NextResponse } from 'next/server';
import { apiRoute, AccessError } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { paymentForm, paymentPayload, paymentBinary } from '@/modules/payments/http';
import { bankOverview, importStatement } from '@/integrations/congress/payments';
export const GET = apiRoute(async (request: Request) => {
  const query = new URL(request.url).searchParams, offset = Number(query.get('offset') ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new AccessError(400, 'Geçerli sayfa gerekli.');
  return NextResponse.json(await bankOverview({ offset, statementId: query.get('statementId') ?? undefined }));
});
export const POST = apiRoute(async (request: Request) => {
  await requireContext('payments.manage', 'REGISTRATION');
  const form = await paymentForm(request);
  return NextResponse.json(await importStatement(paymentPayload(form), await paymentBinary(form.get('file'), true)));
});
