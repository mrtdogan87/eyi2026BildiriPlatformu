'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cmsRequest } from '@/components/cms/admin-shared';
import { paymentLabels, eventLabels } from '@/modules/payments/core';
import type { PaymentOverview } from '@/integrations/congress/payments';
export const money = (minor: number, currency: string) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(minor / 100);
const date = (value: string | null) => value ? new Date(value).toLocaleString('tr-TR') : '—';
const bankDate = (value: string | null) => value ? new Date(value).toLocaleDateString('tr-TR', { timeZone: 'UTC' }) : '—';
export function PaymentManager({ initial, canManage }: { initial: PaymentOverview; canManage: boolean }) {
  const [data, setData] = useState(initial), [kind, setKind] = useState('PENDING'), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const router = useRouter(), endpoint = `/api/admin/registrations/${data.id}/payments`, monetary = kind === 'CREDIT' || kind === 'REFUND';
  const voided = new Set(data.events.filter(e => e.kind === 'VOID').map(e => e.targetId));
  async function refresh() { setData(await cmsRequest(endpoint)); }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const element = e.currentTarget, fields = new FormData(element); setBusy(true); setError(''); setMessage('');
    try {
      const input: Record<string, unknown> = { kind, version: data.version, reason: String(fields.get('reason') ?? ''), confirmed: fields.get('confirmed') === 'on' };
      if (monetary) { const occurred = new Date(String(fields.get('occurredAt'))); if (!Number.isFinite(occurred.getTime())) throw new Error('Geçerli banka işlem tarihi seçin.'); Object.assign(input, { amount: String(fields.get('amount')), currency: data.currency, occurredAt: occurred.toISOString(), reference: String(fields.get('reference')) }); }
      if (kind === 'VOID') input.targetId = String(fields.get('targetId'));
      const form = new FormData(); form.set('payload', JSON.stringify(input)); const evidence = fields.get('evidence'); if (evidence instanceof File && evidence.size) form.set('evidence', evidence);
      await cmsRequest(endpoint, 'POST', form); await refresh(); element.reset(); router.refresh(); setMessage('İşlem gerekçesi ve geçmişiyle kaydedildi.');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <section className="card platform-card payment-manager" style={{ overflowWrap: 'anywhere' }}><div className="cms-actions"><h2>Ödeme doğrulama</h2><Link className="button secondary" href="/admin/odemeler">Banka ekstresi ve eşleştirme</Link><button className="button secondary" disabled={busy} onClick={() => void refresh().catch(e => setError(e.message))}>Ödeme panelini yenile</button></div>
    <p>Dekont yüklemek ödeme onayı değildir. Aşağıdaki tutarlar yetkili ekibin banka kanıtıyla kaydettiği işlemlerden hesaplanır.</p>
    <div className="payment-totals"><div><span>Durum</span><strong>{paymentLabels[data.summary.state]?.[0] ?? data.summary.state}</strong></div><div><span>Kayıt tutarı</span><strong>{money(data.summary.expectedMinor, data.currency)}</strong></div><div><span>Doğrulanan ödeme</span><strong>{money(data.summary.receivedMinor, data.currency)}</strong></div><div><span>Yapılmış iade</span><strong>{money(data.summary.refundedMinor, data.currency)}</strong></div><div><span>Net ödeme</span><strong>{money(data.summary.netMinor, data.currency)}</strong></div><div><span>Kayıt tutarından fark</span><strong>{money(data.summary.differenceMinor, data.currency)}</strong></div></div>
    <p>Dekont: {data.receiptReceived ? 'Dosya var' : 'Dosya yok'} · Eski dekont kayıt tarihi: {date(data.paidAt)} · Son banka doğrulaması: {date(data.summary.verifiedAt)}</p>
    {data.summary.exempt && <p className="notice">Davetli / muaf kaydı var. Kayıt tarifesi korunur; ödeme yapılmış gibi gösterilmez.</p>}
    {error && <p className="error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {canManage && <form className="form-stack" onSubmit={submit}><fieldset disabled={busy}><h3>Gerekçeli işlem kaydet</h3><label className="field">Ödeme işlemi<select value={kind} onChange={e => { setKind(e.target.value); setError(''); setMessage(''); }}><option value="PENDING">Kontrol bekliyor</option><option value="CREDIT">Banka ödemesini elle doğrula</option><option value="EXEMPT">Davetli / muaf kaydet</option><option value="REVOKE_EXEMPT">Muafiyeti kaldır</option><option value="REFUND">Yapılmış banka iadesini kaydet</option><option value="VOID">Hatalı geçmiş işlemini geçersizleştir</option></select></label>
      {kind === 'REFUND' && <p className="notice">Banka üzerinden yapılmış iadenin kanıtını kaydedin. İptal talebi tek başına iade değildir; bu ekran para transfer etmez.</p>}
      {kind === 'VOID' && <label className="field">Geçersizleştirilecek işlem<select name="targetId" required><option value="">İşlem seçin</option>{data.events.filter(e => e.kind !== 'VOID' && !voided.has(e.id)).map(e => <option key={e.id} value={e.id}>{e.number} · {eventLabels[e.kind]} · {money(e.amountMinor, e.currency)}</option>)}</select><span>Önceki kayıt korunur; ona bağlı gerekçeli bir düzeltme eklenir.</span></label>}
      {monetary && <div className="payment-fields"><label className="field">Banka işlem tutarı ({data.currency})<input name="amount" required inputMode="decimal" pattern="(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?" placeholder="1250.50"/><span>Noktalı ondalık, binlik ayırıcı yok.</span></label><label className="field">Banka işlem tarihi<input name="occurredAt" required type="date" max={new Date().toISOString().slice(0, 10)}/></label><label className="field">Banka işlem referansı<input name="reference" required minLength={3} maxLength={128}/></label></div>}
      <label className="field">İşlem gerekçesi<textarea name="reason" required minLength={8} maxLength={2000} rows={3}/></label>
      <label className="field">Banka kanıtı / destekleyici belge<input name="evidence" type="file" accept=".pdf,.jpg,.jpeg,.png" required={monetary}/><span>En fazla 2 MB PDF/JPG/PNG. Elle doğrulama ve iade için bankadan doğrulanmış kanıt gerekir. Yalnız yetkili ekip indirebilir.</span></label>
      <label className="check-item"><input name="confirmed" type="checkbox" required/>Kayıt, gerekçe, tutar ve kanıtı inceledim; bu işlemi kaydetmeyi onaylıyorum.</label><button className="button primary">Ödeme işlemini kaydet</button>
    </fieldset></form>}
    <h3>Ödeme işlem geçmişi</h3>{!data.events.length && <p>Henüz doğrulama kaydı yok. Eski dekont tarihinden ödeme onayı üretilmez.</p>}
    {[...data.events].reverse().map(e => <article className="content-entry" key={e.id}><h4>{e.number} · {eventLabels[e.kind]}{voided.has(e.id) ? ' · geçersizleştirildi' : ''}</h4><p>{e.actorName} · {date(e.createdAt)}</p><p>{e.reason}</p>{e.amountMinor > 0 && <p>{money(e.amountMinor, e.currency)} · Banka tarihi: {bankDate(e.occurredAt)} · Referans: {e.reference}</p>}{e.targetId && <p>Düzeltme, işlem {data.events.find(x => x.id === e.targetId)?.number ?? '—'} ile bağlı.</p>}{e.evidenceName && <p><a href={`${endpoint}/${e.id}`}>Kanıtı indir: {e.evidenceName}</a></p>}{e.bankTransactionId && <p><Link href="/admin/odemeler">Onaylanmış ekstre hareketi</Link></p>}</article>)}
  </section>;
}
