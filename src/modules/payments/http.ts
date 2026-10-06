import { createHash } from 'node:crypto';
import { AccessError } from '@/platform/http';
import { PaymentError } from './core';
import type { z } from 'zod';
export function parsePayment<T>(schema: z.ZodType<T>, raw: unknown): T {
  const value = schema.safeParse(raw);
  if (!value.success) throw new AccessError(400, 'Geçerli ödeme bilgisi, gerekçe ve açık onay gerekli.');
  return value.data;
}
export async function paymentAction<T>(run: () => Promise<T> | T) {
  try { return await run(); } catch (error) { if (error instanceof PaymentError) throw new AccessError(error.status, error.message); throw error; }
}
export async function paymentForm(request: Request) {
  const max = 3 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > max) throw new AccessError(413, 'İstek en fazla 3 MB olabilir.');
  const reader = request.body?.getReader(); if (!reader) throw new AccessError(400, 'Form gerekli.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > max) { await reader.cancel(); throw new AccessError(413, 'İstek en fazla 3 MB olabilir.'); } chunks.push(part.value); }
  try { return await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData(); }
  catch { throw new AccessError(400, 'Geçerli form gerekli.'); }
}
export function paymentPayload(form: FormData) {
  try { const raw = form.get('payload'); if (typeof raw !== 'string' || raw.length > 8192) throw new Error(); return JSON.parse(raw) as unknown; }
  catch { throw new AccessError(400, 'Geçerli ödeme bilgisi gerekli.'); }
}
export type PaymentBinary = { name: string; mime: string; content: Uint8Array<ArrayBuffer>; hash: string };
export async function paymentBinary(raw: FormDataEntryValue | null, csv = false): Promise<PaymentBinary | null> {
  if (raw === null) return null;
  if (!(raw instanceof File) || !raw.size || raw.size > 2 * 1024 * 1024 || raw.name.length > 200 || /[\x00-\x1f]/.test(raw.name)) throw new AccessError(400, 'Dosya en fazla 2 MB olabilir.');
  const name = raw.name, lower = name.toLowerCase(), content = Buffer.from(await raw.arrayBuffer());
  let mime: string;
  if (csv) { if (!lower.endsWith('.csv')) throw new AccessError(400, 'Şablona uygun UTF-8 CSV yükleyin.'); mime = 'text/csv; charset=utf-8'; }
  else if (lower.endsWith('.pdf') && content.subarray(0, 5).toString() === '%PDF-') mime = 'application/pdf';
  else if (lower.endsWith('.png') && content.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = 'image/png';
  else if (/\.jpe?g$/.test(lower) && content[0] === 255 && content[1] === 216 && content[2] === 255) mime = 'image/jpeg';
  else throw new AccessError(400, 'Kanıt gerçek PDF/JPG/PNG içeriği taşımalı.');
  return { name, mime, content, hash: createHash('sha256').update(content).digest('hex') };
}
