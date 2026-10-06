import { AccessError } from '@/platform/http';
import { WorklistError } from './configuration';
export async function worklistJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, 'İstek gövdesi gerekli.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new AccessError(413, 'İstek gövdesi çok büyük.'); } chunks.push(part.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new AccessError(400, 'Geçerli JSON gerekli.'); }
}
export async function worklistAction<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) { if (error instanceof WorklistError) throw new AccessError(error.status, error.message); throw error; }
}
