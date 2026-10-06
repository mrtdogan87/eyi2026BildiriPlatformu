import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { z } from 'zod';
import { AccessError } from '@/platform/http';
import { ReviewError } from './core';
export { revisionForm as reviewForm, formPayload as reviewPayload } from '@/modules/revisions/http';
export function parsed<T>(schema: z.ZodType<T>, input: unknown) { const result = schema.safeParse(input); if (!result.success) throw new AccessError(400, result.error.issues[0]?.message ?? 'Değerlendirme alanlarını kontrol edin.'); return result.data; }
export async function reviewAction<T>(fn: () => Promise<T>) { try { return await fn(); } catch (e) { if (e instanceof ReviewError) throw new AccessError(e.status, e.message); throw e; } }
export type ReviewBinary = { mime: string; hash: string; content: Uint8Array<ArrayBuffer>; name: string };
export async function reviewJson(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new AccessError(400, 'İstek bilgisi gerekli.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 64000) { await reader.cancel(); throw new AccessError(413, 'İstek en fazla 64 KB olabilir.'); } chunks.push(part.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { throw new AccessError(400, 'Geçerli JSON bilgisi gerekli.'); }
}
export async function reviewBinary(raw: FormDataEntryValue | null): Promise<ReviewBinary | null> {
  if (raw === null) return null;
  if (!(raw instanceof File) || !raw.size || raw.size > 10 * 1024 * 1024 || raw.name.length > 200 || /[\x00-\x1f]/.test(raw.name)) throw new AccessError(400, 'En fazla 10 MB PDF veya DOCX gerekli.');
  const content = Buffer.from(await raw.arrayBuffer()), ext = raw.name.toLowerCase().split('.').at(-1);
  if (ext === 'pdf') { if (!content.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new AccessError(400, 'Geçerli PDF gerekli.'); }
  else if (ext === 'docx') { try { const zip = await JSZip.loadAsync(content); if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) throw new Error(); } catch { throw new AccessError(400, 'Geçerli DOCX gerekli.'); } }
  else throw new AccessError(400, 'Yalnız PDF veya DOCX kabul edilir.');
  return { content, hash: createHash('sha256').update(content).digest('hex'), name: raw.name, mime: ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
}
