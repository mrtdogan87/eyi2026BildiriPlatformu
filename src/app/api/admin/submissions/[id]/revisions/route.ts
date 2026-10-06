import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiRoute, AccessError } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { revisionForm, formPayload } from '@/modules/revisions/http';
import { readRevisionBinary } from '@/integrations/congress/revision-files';
import { revisionOverview, correctSubmission, correctFile, requestFileRevision, reviewFileRevision, resolveOutputUpdate } from '@/integrations/congress/revisions';
type Props = { params: Promise<{ id: string }> };
export const GET = apiRoute(async (_: Request, { params }: Props) => NextResponse.json(await revisionOverview((await params).id)));
export const POST = apiRoute(async (request: Request, { params }: Props) => {
  await requireContext('submissions.correct', 'SUBMISSIONS');
  const { id } = await params, form = await revisionForm(request);
  const envelope = z.object({ action: z.enum(['METADATA', 'FILE', 'REQUEST', 'REVIEW', 'OUTPUT']), input: z.unknown(), entryId: z.string().min(1).max(128).optional() }).strict().safeParse(formPayload(form));
  if (!envelope.success) throw new AccessError(400, 'Geçerli düzeltme işlemi gerekli.');
  const { action, input, entryId } = envelope.data;
  if (action === 'METADATA') {
    if (form.has('file')) throw new AccessError(400, 'İçerik düzeltmesinde DOCX kullanılmaz.');
    return NextResponse.json(await correctSubmission(id, input, await readRevisionBinary(form.get('evidence'), true)));
  }
  if (action === 'FILE') return NextResponse.json(await correctFile(id, input, await readRevisionBinary(form.get('file')), await readRevisionBinary(form.get('evidence'), true)));
  if (form.has('file') || form.has('evidence')) throw new AccessError(400, 'Bu işlemde dosya kullanılmaz.');
  if (action === 'REQUEST') return NextResponse.json(await requestFileRevision(id, input));
  if (!entryId) throw new AccessError(400, 'İlgili kayıt gerekli.');
  return NextResponse.json(action === 'REVIEW' ? await reviewFileRevision(id, entryId, input) : await resolveOutputUpdate(id, entryId, input));
});
