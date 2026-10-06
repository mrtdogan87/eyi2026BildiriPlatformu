import { AccessError } from '@/platform/http';
export async function revisionForm(request: Request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > 13 * 1024 * 1024) throw new AccessError(413, 'İstek en fazla 13 MB olabilir.');
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, 'İstek gövdesi gerekli.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 13 * 1024 * 1024) { await reader.cancel(); throw new AccessError(413, 'İstek en fazla 13 MB olabilir.'); } chunks.push(part.value); }
  try { return await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData(); }
  catch { throw new AccessError(400, 'Geçerli form verisi gerekli.'); }
}
export function formPayload(form: FormData) {
  try { const raw = form.get('payload'); if (typeof raw !== 'string' || raw.length > 500000) throw new Error(); return JSON.parse(raw) as unknown; }
  catch { throw new AccessError(400, 'Geçerli düzeltme bilgisi gerekli.'); }
}
