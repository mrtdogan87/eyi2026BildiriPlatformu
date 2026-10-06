import { AccessError } from './http';
export async function boundedJson(request: Request, max = 32768): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, 'İstek gövdesi gerekli.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    length += part.value.byteLength;
    if (length > max) { await reader.cancel(); throw new AccessError(413, 'İstek gövdesi çok büyük.'); }
    chunks.push(part.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AccessError(400, 'Geçerli JSON gerekli.'); }
}
