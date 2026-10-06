import { z } from 'zod';
import { AccessError } from '@/platform/http';
import { ActivityError } from './core';
export function parsed<T>(schema: z.ZodType<T>, input: unknown) { const r = schema.safeParse(input); if (!r.success) throw new AccessError(400, r.error.issues[0]?.message ?? 'Etkinlik alanlarını kontrol edin.'); return r.data; }
export async function activityAction<T>(fn: () => Promise<T>) { try { return await fn(); } catch (e) { if (e instanceof ActivityError) throw new AccessError(e.status, e.message); throw e; } }
export async function activityJson(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new AccessError(400, 'İstek bilgisi gerekli.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const p = await reader.read(); if (p.done) break; size += p.value.byteLength; if (size > 64000) { await reader.cancel(); throw new AccessError(413, 'İstek en fazla 64 KB olabilir.'); } chunks.push(p.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { throw new AccessError(400, 'Geçerli JSON gerekli.'); }
}
