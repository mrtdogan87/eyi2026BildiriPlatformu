import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { paymentForm, paymentPayload, paymentBinary } from '@/modules/payments/http';
import { paymentOverview, recordPayment } from '@/integrations/congress/payments';
type Props = { params: Promise<{ id: string }> };
export const GET = apiRoute(async (_: Request, { params }: Props) => NextResponse.json(await paymentOverview((await params).id)));
export const POST = apiRoute(async (request: Request, { params }: Props) => {
  await requireContext('payments.manage', 'REGISTRATION');
  const form = await paymentForm(request);
  return NextResponse.json(await recordPayment((await params).id, paymentPayload(form), await paymentBinary(form.get('evidence'))));
});
