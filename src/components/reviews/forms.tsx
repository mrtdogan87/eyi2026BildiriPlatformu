'use client';
import {uiFetch} from '@/components/admin-ui/mutation';
import type { FormEvent } from 'react';
import type { z } from 'zod';
import type { evaluationSchema } from '@/modules/reviews/core';
export const formOf = (e: FormEvent<HTMLFormElement>) => new FormData(e.currentTarget);
export const text = (f: FormData, name: string) => String(f.get(name) ?? '');
export const checked = (f: FormData, name: string) => f.get(name) === 'on';
export const iso = (f: FormData, name: string) => new Date(text(f, name)).toISOString();
export const future = () => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16);
export function Confirmation() { return <label className="checkbox-field"><input type="checkbox" name="confirmed" required /> İlgili bildiri, tur, hedef kayıt ve gerekçeyi inceledim; işlemi onaylıyorum.</label>; }
export function Reason({ name = 'reason', label = 'İşlem gerekçesi' }: { name?: string; label?: string }) { return <label className="field">{label}<textarea name={name} required minLength={8} maxLength={2000} rows={3} /></label>; }
type Evaluation = z.infer<typeof evaluationSchema>;
export function EvaluationFields({ criteria, initial }: { criteria: Array<{ id: string; tr: string; en: string }>; initial?: Pick<Evaluation, 'scores' | 'recommendation' | 'authorComment' | 'internalComment'> | null }) {
  return <><p>Ölçüt başına 1 (en düşük) – 5 (en yüksek). Puanlar kendiliğinden kabul/ret kararı oluşturmaz.</p>{criteria.map(c => <label className="field" key={c.id}>{c.tr} / {c.en}<select name={`score:${c.id}`} defaultValue={initial?.scores[c.id] ?? ''}><option value="">Puan seçin</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}<label className="field">Karar önerisi<select name="recommendation" defaultValue={initial?.recommendation ?? 'REVISE'}><option value="ACCEPT">Kabul önerisi</option><option value="REVISE">Revizyon önerisi</option><option value="REJECT">Ret önerisi</option></select></label><label className="field">Yazara açık yorum<textarea name="authorComment" defaultValue={initial?.authorComment ?? ''} maxLength={5000} rows={5} /></label><label className="field">Yalnız editöre yorum<textarea name="internalComment" defaultValue={initial?.internalComment ?? ''} maxLength={5000} rows={4} /></label></>;
}
export function evaluationOf(f: FormData, version: number, criteria: Array<{ id: string }>, submit: boolean) { return { version, submit, scores: Object.fromEntries(criteria.filter(c => text(f, `score:${c.id}`)).map(c => [c.id, Number(text(f, `score:${c.id}`))])), recommendation: text(f, 'recommendation'), authorComment: text(f, 'authorComment'), internalComment: text(f, 'internalComment'), confirmed: checked(f, 'confirmed') }; }
export async function reviewRequest<T>(url: string, payload: unknown, file?: File | null) {
  const form = file !== undefined ? new FormData() : null;
  if (form) { form.set('payload', JSON.stringify(payload)); if (file?.size) form.set('file', file); }
  const response = await uiFetch(url, { method: 'POST', headers: form ? {} : { 'Content-Type': 'application/json' }, body: form ?? JSON.stringify(payload) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'İşlem tamamlanamadı.'); return data as T;
}
export async function readReview<T>(url: string) { const r = await fetch(url); const data = await r.json(); if (!r.ok) throw new Error(data.error ?? 'Kayıt okunamadı.'); return data as T; }
