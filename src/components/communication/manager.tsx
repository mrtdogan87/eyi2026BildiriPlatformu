'use client';
import { useState } from 'react';
import type { communicationOverview, communicationMessage } from '@/modules/communication/admin';
import { templatePlaceholders, type TemplateKey } from '@/modules/communication/templates';
import { cmsRequest } from '@/components/cms/admin-shared';

type Overview = Awaited<ReturnType<typeof communicationOverview>>;
type Template = Overview['templates'][number];
const endpoint = '/api/platform/communication';
const labels: Record<TemplateKey, string> = { DRAFT_ACCESS: 'Taslak erişimi', REGISTRATION_ACCESS: 'Kayıt erişimi', SUBMISSION_RECEIVED: 'Bildiri alındı', SUBMISSION_STATUS: 'Bildiri durumu', ACCOUNT_ACTIVATION: 'Hesap etkinleştirme', GENERAL: 'Sekretarya mesajı' };
const statuses: Record<string, string> = { PENDING: 'Kuyrukta', PROCESSING: 'İşleniyor', RETRY: 'Yeniden deneme bekliyor', CAPTURED: 'Yerelde yakalandı', ACCEPTED: 'Sağlayıcı kabul etti', PERMANENT_FAILURE: 'Kalıcı hata', UNKNOWN: 'Gönderim sonucu belirsiz', CANCELLED: 'İptal edildi' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—';

function TemplateEditor({ template, canManage, capture, onSaved }: { template: Template; canManage: boolean; capture: boolean; onSaved: () => Promise<void> }) {
  const [subject, setSubject] = useState(template.subject), [body, setBody] = useState(template.body);
  const [recipient, setRecipient] = useState('preview@example.invalid'), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [preview, setPreview] = useState<{ subject: string; text: string; html: string } | null>(null);
  const [requestKey, setRequestKey] = useState('');
  const dirty = subject !== template.subject || body !== template.body;
  async function action(kind: 'preview' | 'save' | 'test') {
    setBusy(true); setMessage('');
    try {
      if (kind === 'preview') setPreview(await cmsRequest(`${endpoint}/preview`, 'POST', { key: template.key, locale: template.locale, subject, body }));
      if (kind === 'save') { await cmsRequest(`${endpoint}/templates`, 'PUT', { key: template.key, locale: template.locale, subject, body, version: template.version }); await onSaved(); }
      if (kind === 'test') {
        const key = requestKey || crypto.randomUUID(); setRequestKey(key);
        const result = await cmsRequest(`${endpoint}/test`, 'POST', { key: template.key, locale: template.locale, recipient, requestKey: key });
        setMessage(`Örnek kuyruğa kaydedildi: ${result.id}. Durumu gönderim geçmişinden yenileyebilirsiniz. Aynı örneği tekrar istemek ikinci ileti oluşturmaz.`);
        await onSaved();
      }
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div><p>Kayıtlı sürüm: {template.version || 'Başlangıç şablonu'}. Kuyruğa alınmış iletilerin içeriği sonraki şablon değişikliklerinden etkilenmez.</p>
    <p>Kullanılabilir alanlar: {templatePlaceholders(template.key).map(name => <code key={name} style={{ marginRight: 8 }}>{`{{${name}}}`}</code>)}</p>
    <label className="field">E-posta konusu<input value={subject} maxLength={200} readOnly={!canManage} onChange={e => { setSubject(e.target.value); setPreview(null); setRequestKey(''); }} /></label>
    <label className="field">Mesaj metni<textarea rows={9} value={body} maxLength={12000} readOnly={!canManage} onChange={e => { setBody(e.target.value); setPreview(null); setRequestKey(''); }} /></label>
    <p>Metin alanları güvenli HTML olarak oluşturulur. Önizleme yalnız örnek veriler içerir.</p>
    <div className="cms-actions"><button className="button secondary" disabled={busy} onClick={() => void action('preview')}>Önizle</button>{canManage && <button className="button primary" disabled={busy || !dirty} onClick={() => void action('save')}>Şablonu kaydet</button>}</div>
    {preview && <section aria-label="E-posta önizlemesi"><h3>{preview.subject}</h3><iframe title="Şablon HTML önizlemesi" srcDoc={preview.html} sandbox="" referrerPolicy="no-referrer" style={{ width: '100%', minHeight: 260, border: '1px solid #d6e1f1', borderRadius: 10, background: '#fff' }} /><details><summary>Düz metni göster</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{preview.text}</pre></details></section>}
    {capture && <fieldset disabled={busy}><legend>Örnek e-posta</legend><p>Örnek yerelde yakalanır; gerçek alıcıya teslim edilmez. Kaydedilmiş şablon kullanılır.</p><label className="field">Test alıcısı<input type="email" value={recipient} onChange={e => { setRecipient(e.target.value); setRequestKey(''); }} /></label><button className="button secondary" disabled={dirty} onClick={() => void action('test')}>Örneği kuyruğa al</button>{dirty && <p>Önce şablonu kaydedin.</p>}{requestKey && <button className="button secondary" onClick={() => { setRequestKey(''); setMessage('Yeni örnek için farklı bir gönderim anahtarı hazır.'); }}>Yeni örnek hazırla</button>}</fieldset>}
    {message && <p role="status" style={{ overflowWrap: 'anywhere' }}>{message}</p>}
  </div>;
}

export function CommunicationManager({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [key, setKey] = useState<TemplateKey>('DRAFT_ACCESS'), [locale, setLocale] = useState<'tr' | 'en'>('tr');
  const [status, setStatus] = useState(''), [history, setHistory] = useState<Awaited<ReturnType<typeof communicationMessage>> | null>(null);
  const [replyTo, setReplyTo] = useState(initial.settings.replyTo), [replyUrl, setReplyUrl] = useState(initial.settings.replyUrl);
  const [settingsVersion, setSettingsVersion] = useState(initial.settings.version);
  const template = data.templates.find(t => t.key === key && t.locale === locale)!;
  async function refresh() { setData(await cmsRequest(endpoint)); }
  async function act(work: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage('');
    try { await work(); await refresh(); setMessage(success); }
    catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="content-management">
    <section className="card platform-card"><h2>Gönderim durumu</h2><p>Sağlayıcının iletiyi kabul etmesi, alıcıya teslim veya okunma teyidi değildir. Bu sürümde teslim/okunma teyidi alınmıyor. Yerelde yakalanan örnekler gerçek gönderim sayılmaz.</p><p>Son 100 ileti ve son 100 teslim sorunu gösterilir. İşlem geçmişi yalnız seçili kongreye aittir.</p><button className="button secondary" disabled={busy} onClick={() => void act(refresh, 'Liste güncellendi.')}>Listeyi yenile</button>{message && <p role="status">{message}</p>}</section>
    <section className="card platform-card"><h2>Yanıt ve iletişim</h2><p>Reply-To adresini kongre ekibinin takip ettiği posta kutusuna ayarlayın. Sekretarya mesajı şablonu için yanıt adresi zorunludur. Gelen kutusu otomatik içe aktarılmaz.</p>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { const saved = await cmsRequest(`${endpoint}/settings`, 'PUT', { version: settingsVersion, replyTo, replyUrl }); setSettingsVersion(saved.version); setReplyTo(saved.replyTo); setReplyUrl(saved.replyUrl); }, 'Yanıt ayarları kaydedildi.'); }}><fieldset disabled={!data.canManage || busy}>
        <label className="field">Yanıt adresi (Reply-To)<input type="email" value={replyTo} maxLength={254} onChange={e => setReplyTo(e.target.value)} placeholder="sekreterya@example.invalid" /></label>
        <label className="field">Kongre iletişim / katılımcı sayfası<input type="url" value={replyUrl} maxLength={1000} onChange={e => setReplyUrl(e.target.value)} placeholder={`https://kongre.example.invalid/${data.congress.slug}/sayfalar/iletisim`} /></label>
        {data.canManage && <button className="button primary">Yanıt ayarlarını kaydet</button>}</fieldset></form><button className="button secondary" disabled={busy} onClick={() => void act(async () => { const saved = await cmsRequest(`${endpoint}/settings`); setSettingsVersion(saved.version); setReplyTo(saved.replyTo); setReplyUrl(saved.replyUrl); }, 'Güncel yanıt ayarları yüklendi.')}>Kayıtlı yanıt ayarlarını yeniden yükle</button>{!data.canManage && <p>Şablon ve yanıt ayarlarını organizatör düzenler.</p>}
    </section>
    <section className="card platform-card"><h2>TR / EN şablonları</h2><div className="cms-fields"><label className="field">Şablon<select value={key} onChange={e => setKey(e.target.value as TemplateKey)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Dil<select value={locale} onChange={e => setLocale(e.target.value as 'tr' | 'en')}><option value="tr">Türkçe</option><option value="en">English</option></select></label></div><TemplateEditor key={`${key}:${locale}:${template.version}`} template={template} canManage={data.canManage} capture={data.mode !== 'production'} onSaved={refresh} /></section>
    <section className="card platform-card"><h2>Teslim sorunları</h2><p>Kalıcı hatalar otomatik tekrar edilmez. Doğrulanmış adres düzeltmesi yeni ileti oluşturur; ilk iletinin geçmişi korunur. Erişim ve etkinleştirme bağlantıları başka adrese taşınamaz. Belirsiz sonucu incelemeden yeniden gönderim yapılmaz.</p>
      {!data.issues.some(i => i.status === 'OPEN') && <p>Açık teslim sorunu yok.</p>}
      {data.issues.filter(i => i.status === 'OPEN').map(i => <article className="content-entry" key={`${i.id}:${i.version}`}><h3>{i.message.subject}</h3><p>{i.message.recipient} · {statuses[i.message.status]} · {date(i.createdAt)}</p><p>İleti: {i.message.id}</p><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const recipient = String(f.get('recipient') || '').trim(); void act(() => cmsRequest(`${endpoint}/issues/${i.id}`, 'PATCH', { version: i.version, action: recipient ? 'CORRECT_ADDRESS' : 'RESOLVE', note: f.get('note'), ...(recipient ? { recipient } : {}) }), 'Teslim sorunu güncellendi.'); }}><fieldset disabled={busy}><label className="field">İnceleme sonucu / adres doğrulama gerekçesi<textarea name="note" required minLength={8} maxLength={2000} defaultValue={i.note} /></label>{i.message.status === 'PERMANENT_FAILURE' && !['DRAFT_ACCESS', 'REGISTRATION_ACCESS', 'ACCOUNT_ACTIVATION'].includes(i.message.templateKey) && <label className="field">Doğrulanmış yeni alıcı adresi (isteğe bağlı)<input name="recipient" type="email" maxLength={254} /><small>Boş bırakılırsa yalnız inceleme kapanır; e-posta gönderilmez.</small></label>}<button className="button secondary">İncelemeyi tamamla</button></fieldset></form></article>)}
    </section>
    <section className="card platform-card"><h2>Gönderim geçmişi</h2><label className="field">Durum filtresi<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tümü</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {data.messages.filter(m => !status || m.status === status).map(m => <article className="content-entry" key={m.id} style={{ overflowWrap: 'anywhere' }}><h3>{m.subject}</h3><p>{m.recipient} · {m.locale.toUpperCase()} · {statuses[m.status]}</p><p>{date(m.createdAt)} · Deneme: {m.attempts} · Şablon sürümü: {m.templateVersion}</p>{m.replyTo && <p>Reply-To: {m.replyTo}</p>}{m.status === 'RETRY' && <p>Sonraki deneme: {date(m.nextAttemptAt)}</p>}{m.status === 'ACCEPTED' && <p>Kabul: {date(m.acceptedAt)}. Teslim ve okunma: teyit yok.</p>}<button className="button secondary" disabled={busy} onClick={() => void act(async () => setHistory(await cmsRequest(`${endpoint}/messages/${m.id}`)), 'Deneme geçmişi açıldı.')}>Deneme geçmişi</button>{m.status === 'RETRY' && <button className="button secondary" disabled={busy} onClick={() => void act(() => cmsRequest(`${endpoint}/messages/${m.id}/retry`, 'POST', { version: m.version }), 'Yeniden deneme kuyruğa alındı.')}>Şimdi yeniden dene</button>}
        {['PENDING', 'RETRY', 'UNKNOWN', 'PERMANENT_FAILURE'].includes(m.status) && <details><summary>İptal et</summary><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void act(() => cmsRequest(`${endpoint}/messages/${m.id}/cancel`, 'POST', { version: m.version, reason: f.get('reason') }), 'İleti iptal edildi.'); }}><label className="field">İptal gerekçesi<input name="reason" required minLength={8} maxLength={1000} /></label><button className="button secondary" disabled={busy}>İptali kaydet</button></form></details>}
      </article>)}{!data.messages.length && <p>Henüz kuyruğa alınmış ileti yok.</p>}
      {history && <section aria-label="Deneme geçmişi" className="content-entry"><h3>Deneme geçmişi: {history.message.subject}</h3><p>Güvenli erişim bağlantıları ve ileti gövdeleri burada gösterilmez.</p>{history.attempts.length === 0 && <p>Henüz deneme yapılmadı.</p>}{history.attempts.map(a => <p key={a.number}>{a.number}. {date(a.startedAt)} · {a.provider} · {statuses[a.outcome] || a.outcome}{a.errorCode ? ` · ${a.errorCode}` : ''}</p>)}<button className="button secondary" onClick={() => setHistory(null)}>Geçmişi kapat</button></section>}
    </section>
  </div>;
}
