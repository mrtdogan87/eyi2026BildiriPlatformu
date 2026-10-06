'use client';
import Link from 'next/link';
import { useState } from 'react';
import { cmsRequest } from '@/components/cms/admin-shared';
import type { worklistOverview, workRequestDetail } from '@/integrations/congress/worklist';

type Overview = Awaited<ReturnType<typeof worklistOverview>>;
type RequestRow = Overview['requests'][number];
type Detail = Awaited<ReturnType<typeof workRequestDetail>>;
const endpoint = '/api/platform/worklist';
const statuses = { NEW: 'Yeni', IN_PROGRESS: 'İnceleniyor', WAITING: 'Yanıt / işlem bekliyor', RESOLVED: 'Sonuçlandı' };
const kinds = { WITHDRAWAL_REQUEST: 'Bildiri geri çekme talebi', CANCELLATION_REQUEST: 'Kayıt iptal talebi', MANUAL_EMAIL: 'E-postadan alınan talep', QUESTION: 'Soru / yardım talebi' };
const sourceLabels = { SUBMISSION: 'Bildiriler', REGISTRATION: 'Kayıtlar', FEEDBACK: 'Geri bildirimler', EMAIL_ISSUE: 'E-posta teslim sorunları' };
const deliveryStatuses: Record<string, string> = { PERMANENT_FAILURE: 'Kalıcı hata', UNKNOWN: 'Gönderim sonucu belirsiz', CANCELLED: 'İptal edildi', CAPTURED: 'Yerelde yakalandı', ACCEPTED: 'Sağlayıcı kabul etti' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—';
const textStyle = { whiteSpace: 'pre-wrap' as const, overflowWrap: 'anywhere' as const };

function RequestEditor({ row, data, busy, onSave, onHistory }: { row: RequestRow; data: Overview; busy: boolean; onSave: (id: string, value: unknown) => void; onHistory: (id: string) => void }) {
  const [status, setStatus] = useState(row.status);
  const source = data.sourceOptions.find(option => option.type === row.sourceType && option.id === row.sourceId);
  const currentAssignee = data.assignees.find(person => person.id === row.assigneeId);
  return <article className="content-entry" style={{ overflowWrap: 'anywhere' }}>
    <h3>{row.subject}</h3>
    <p><strong>{kinds[row.kind]}</strong> · {statuses[row.status]} · {row.origin === 'PARTICIPANT' ? 'Katılımcı paneli' : 'Sekreterya kaydı'}</p>
    <p>{row.requesterName ? `${row.requesterName} · ` : ''}{row.requesterEmail} · {date(row.createdAt)}</p>
    <p style={textStyle}>{row.description}</p>
    {source ? <p>İlgili kayıt: <Link href={source.href}>{source.label}</Link></p> : row.sourceType ? <p>İlgili kayıt bağlı; kaynak kapalı veya güncel seçim listesinde yer almıyor. Talep geçmişi korunur.</p> : <p>Belirli bir kayda bağlı değil.</p>}
    <p>Sorumlu: {currentAssignee?.name ?? (row.assigneeId ? 'Önceki sorumlu artık atanabilir değil' : 'Atanmamış')}</p>
    <details><summary>Talebi güncelle</summary>
      <form onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); onSave(row.id, {
        version: row.version, status, assigneeId: fields.get('assigneeId') || null, publicResult: fields.get('publicResult'), internalNote: fields.get('internalNote'),
      }); }}>
        <fieldset disabled={busy}>
          <div className="cms-fields">
            <label className="field">Talep durumu<select value={status} onChange={event => setStatus(event.target.value as RequestRow['status'])}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field">Sorumlu<select name="assigneeId" defaultValue={currentAssignee?.id ?? ''}><option value="">Atanmamış</option>{data.assignees.map(person => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label>
          </div>
          <label className="field">Katılımcıya açık sonuç<textarea name="publicResult" defaultValue={row.publicResult} rows={3} maxLength={4000} minLength={status === 'RESOLVED' ? 8 : undefined} required={status === 'RESOLVED'} /><small>Panelden açılan taleplerde katılımcı bu açıklamayı görür. Sonuçlandırırken en az 8 karakter gerekir.</small></label>
          <label className="field">Yalnız ekip için iç not<textarea name="internalNote" defaultValue={row.internalNote} rows={3} maxLength={4000} /><small>Katılımcıya gösterilmez.</small></label>
          <p>Talebi sonuçlandırmak bildiriyi geri çekmez, kaydı iptal etmez ve banka iadesi oluşturmaz.</p>
          <button className="button primary">Talebi kaydet</button>
        </fieldset>
      </form>
    </details>
    <button className="button secondary" disabled={busy} onClick={() => onHistory(row.id)}>İşlem geçmişi</button>
  </article>;
}

export function WorklistManager({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN'), [assigneeFilter, setAssigneeFilter] = useState('');
  const [history, setHistory] = useState<Detail | null>(null), [requestKey, setRequestKey] = useState('');
  const [newSource, setNewSource] = useState(''), [newFormVersion, setNewFormVersion] = useState(0);
  const filtered = data.requests.filter(row => (statusFilter === 'OPEN' ? row.status !== 'RESOLVED' : !statusFilter || row.status === statusFilter) && (!assigneeFilter || (assigneeFilter === 'UNASSIGNED' ? !row.assigneeId : row.assigneeId === assigneeFilter)));
  async function refresh() { setData(await cmsRequest(endpoint)); }
  async function act(work: () => Promise<unknown>, success: string, reload = true) {
    setBusy(true); setMessage('');
    try { await work(); if (reload) await refresh(); setMessage(success); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  const activeFeedback = data.sources.feedback.filter(item => item.status !== 'CLOSED');
  const activeIssues = data.sources.deliveryIssues.filter(item => item.status === 'OPEN');
  return <div className="content-management">
    <section className="card platform-card">
      <h2>Takip özeti</h2>
      <p>{data.requests.filter(row => row.status !== 'RESOLVED').length} açık talep · {data.sources.missing.length} takip işlemi · {activeFeedback.length} açık geri bildirim · {activeIssues.length} teslim sorunu</p>
      <p>Talep, e-posta, ödeme ve bildiri durumları ayrı izlenir. Ekranda en son {data.limits.requests} talep gösterilir.</p>
      <button className="button secondary" disabled={busy} onClick={() => void act(async () => { await refresh(); if (history) setHistory(await cmsRequest(`${endpoint}/${history.request.id}`)); }, 'Listeler güncellendi.', false)}>Listeyi yenile</button>
      {message && <p role="status" aria-live="polite" style={{ overflowWrap: 'anywhere' }}>{message}</p>}
    </section>

    <section className="card platform-card"><h2>Eksik işlemler ve dekont takibi</h2><p>Açık modüllerin mevcut kurallarına göre hazırlanır. Dekontun alınması ödeme doğrulaması değildir. Doğrulama ve henüz geliştirilmemiş program/görev işlemleri tamamlanmış sayılmaz.</p>
      {data.sources.missing.length ? <div className="content-management">{data.sources.missing.map(item => <article className="content-entry" key={item.id} style={{ overflowWrap: 'anywhere' }}><h3><Link href={item.href}>{item.subject}</Link></h3><p>{item.email}</p><ul>{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></article>)}</div> : <p>Gösterilecek eksik işlem yok.</p>}
    </section>

    <section className="card platform-card"><h2>Geri bildirim ve teslim sorunları</h2><p>Bu kayıtların durumları kendi ekranlarından yönetilir. Talep sonucunu kaydetmek kaynak kaydın durumunu değiştirmez.</p>
      <div className="content-gallery"><section><h3>Açık geri bildirimler</h3>{activeFeedback.length ? activeFeedback.map(item => <article className="content-entry" key={item.id}><h4><Link href={item.href}>{item.subject}</Link></h4><p>{item.senderName} · {item.email}</p><p>{item.status === 'IN_PROGRESS' ? 'İnceleniyor' : 'Yeni'} · {date(item.createdAt)}</p></article>) : <p>Açık geri bildirim yok.</p>}</section>
        <section><h3>Açık teslim sorunları</h3>{activeIssues.length ? activeIssues.map(item => <article className="content-entry" key={item.id} style={{ overflowWrap: 'anywhere' }}><h4><Link href={item.href}>{item.subject}</Link></h4><p>{item.recipient} · {deliveryStatuses[item.messageStatus] ?? item.messageStatus}</p><p>{date(item.createdAt)}</p></article>) : <p>Açık teslim sorunu yok.</p>}</section></div>
    </section>

    <section className="card platform-card"><h2>E-postadan veya görüşmeden talep ekle</h2><p>Gelen kutusu otomatik içe aktarılmaz. İlgili mesajı özetleyin ve bu kongredeki kayda bağlayın. Bu işlem e-posta göndermez.</p>
      <form key={newFormVersion} onChange={() => setRequestKey('')} onSubmit={event => {
        event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); const key = requestKey || crypto.randomUUID(); setRequestKey(key);
        const source = data.sourceOptions.find(option => `${option.type}:${option.id}` === newSource);
        void act(async () => {
          await cmsRequest(endpoint, 'POST', { requestKey: key, kind: fields.get('kind'), requesterEmail: fields.get('requesterEmail'), requesterName: fields.get('requesterName'), subject: fields.get('subject'), description: fields.get('description'), assigneeId: fields.get('assigneeId') || null,
            ...(source ? { sourceType: source.type, sourceId: source.id } : {}) });
          setNewFormVersion(value => value + 1); setNewSource(''); setRequestKey('');
        }, 'Talep oluşturuldu.');
      }}><fieldset disabled={busy}>
        <div className="cms-fields"><label className="field">Talep türü<select name="kind"><option value="MANUAL_EMAIL">E-postadan alınan talep</option><option value="QUESTION">Soru / yardım talebi</option></select></label><label className="field">Sorumlu<select name="assigneeId"><option value="">Atanmamış</option>{data.assignees.map(person => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select></label></div>
        <div className="cms-fields"><label className="field">Talep sahibinin e-postası<input name="requesterEmail" type="email" required maxLength={254} /></label><label className="field">Talep sahibinin adı<input name="requesterName" maxLength={180} /></label></div>
        <label className="field">İlgili kayıt<select value={newSource} onChange={event => setNewSource(event.target.value)}><option value="">Belirli bir kayda bağlı değil</option>{Object.entries(sourceLabels).map(([type, label]) => <optgroup key={type} label={label}>{data.sourceOptions.filter(option => option.type === type).map(option => <option key={option.id} value={`${option.type}:${option.id}`}>{option.label} · {option.type === 'REGISTRATION' ? date(option.detail) : option.detail}</option>)}</optgroup>)}</select><small>Yalnız bu kongrede erişilebilen son kayıtlar gösterilir. Kapalı modüllere yeni talep bağlanamaz.</small></label>
        <label className="field">Konu<input name="subject" required minLength={3} maxLength={200} /></label>
        <label className="field">Talebin açıklaması<textarea name="description" required minLength={8} maxLength={6000} rows={4} /></label>
        <button className="button primary">Talebi oluştur</button>
      </fieldset></form>
    </section>

    <section className="card platform-card"><h2>Talepler</h2>
      <div className="cms-fields"><label className="field">Durum filtresi<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="OPEN">Açık talepler</option><option value="">Tüm talepler</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field">Sorumlu filtresi<select value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)}><option value="">Tüm sorumlular</option><option value="UNASSIGNED">Atanmamış</option>{data.assignees.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label></div>
      <div className="content-management">{filtered.map(row => <RequestEditor key={`${row.id}:${row.version}`} row={row} data={data} busy={busy}
        onSave={(id, value) => { void act(async () => { await cmsRequest(`${endpoint}/${id}`, 'PATCH', value); if (history?.request.id === id) setHistory(await cmsRequest(`${endpoint}/${id}`)); }, 'Talep güncellendi.'); }}
        onHistory={id => { void act(async () => setHistory(await cmsRequest(`${endpoint}/${id}`)), 'Talep geçmişi açıldı.', false); }} />)}</div>
      {!filtered.length && <p>Bu filtreye uygun talep yok.</p>}
      {history && <section className="content-entry" aria-label="Talep işlem geçmişi" style={{ marginTop: 20 }}><h3>İşlem geçmişi: {history.request.subject}</h3>{history.events.map(event => <article className="content-entry" key={event.id}><p><strong>{event.number}. kayıt</strong> · {event.actorName} · {date(event.createdAt)}</p><p>{event.fromStatus ? `${statuses[event.fromStatus]} → ` : ''}{statuses[event.toStatus]} · Sorumlu: {data.assignees.find(person => person.id === event.assigneeId)?.name ?? (event.assigneeId ? 'Önceki ekip üyesi' : 'Atanmamış')}</p>{event.publicResult && <><strong>Katılımcıya açık sonuç</strong><p style={textStyle}>{event.publicResult}</p></>}{event.internalNote && <><strong>Yalnız ekip için iç not</strong><p style={textStyle}>{event.internalNote}</p></>}</article>)}<button className="button secondary" onClick={() => setHistory(null)}>Geçmişi kapat</button></section>}
    </section>
  </div>;
}
