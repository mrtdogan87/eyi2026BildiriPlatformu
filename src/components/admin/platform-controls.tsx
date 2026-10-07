'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccessEditor,AccessInvite } from '@/components/platform-management/controls';
import type { CongressRole } from '@prisma/client';
async function change(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'İşlem tamamlanamadı.'); return result;
}
export function ContextSelector({ contexts, selected }: { contexts: { id: string; name: string; organization: string }[]; selected: string | null }) {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <div className="field"><label htmlFor="congress-context">Kurum / kongre</label><select id="congress-context" disabled={busy} value={selected ?? ''} onChange={async e => {
    setBusy(true); setError(''); try { await change('/api/platform/context', 'POST', { congressId: e.target.value }); router.push('/admin/panel'); router.refresh(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }}><option value="" disabled>Kongre seçin</option>{contexts.map(c => <option key={c.id} value={c.id}>{c.organization} / {c.name}</option>)}</select>{error && <p className="error">{error}</p>}</div>;
}
export function MemberControls({members,congress}:{members:{id:string;role:CongressRole;roles:CongressRole[];active:boolean;activationNeeded:boolean;user:{id:string;email:string;name:string;active:boolean}}[];congress:{id:string;name:string;organizationId:string}}){return <><AccessInvite organizations={[]} congresses={[congress]} congressId={congress.id}/><h2>Mevcut kongre üyelikleri</h2>{members.map(m=><details className="card platform-card" key={m.id}><summary>{m.user.name} · {m.user.email} · {!m.user.active?'Kişisel hesap kapalı':m.active?'Üyelik açık':'Üyelik kapalı'}</summary><AccessEditor scope="CONGRESS" userId={m.user.id} congressId={congress.id} initialRoles={m.roles} active={m.active} activationNeeded={m.activationNeeded}/></details>)}</>;}
export function ModuleControls({ modules }: { modules: { key: string; label: string; enabled: boolean; implemented: boolean }[] }) {
  const router = useRouter(); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  return <><p>Modülü kapatmak geçmiş kayıtları silmez. Açıldığında mevcut kayıtlarla devam eder.</p><p>Oturum yoklaması ayrı açılır; program oturumlarını kullanır. Yoklamayı kapatmak program yayınını kapatmaz. Kapalı yoklama, yeni belge ve ödül uygunluğunda olumlu katılım kanıtı sayılmaz.</p><div className="platform-members">{modules.map(module => <div className="platform-member" key={module.key}><div><strong>{module.label}</strong><p>{module.implemented ? module.enabled ? 'Kullanıma açık' : 'Kapalı' : 'Sonraki paketlerde hazırlanacak'}</p></div><button className="button secondary" disabled={busy || !module.implemented} onClick={async () => { setBusy(true); setMessage(''); try { await change('/api/platform/modules', 'PATCH', { key: module.key, enabled: !module.enabled }); router.refresh(); } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); } }}>{module.enabled ? 'Kapat' : 'Aç'}</button></div>)}</div><p role="status">{message}</p></>;
}
export function ActivationForm() {
  const params = useSearchParams(); const token = params.get('token') ?? ''; const [message, setMessage] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  return <form className="card platform-card" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); try { await change('/api/platform/activate', 'POST', { token, password: data.get('password') }); setDone(true); setMessage('Hesabınız etkinleşti. Kişisel hesabınızla giriş yapabilirsiniz.'); } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); } }}><h1>Hesabınızı etkinleştirin</h1><div className="field"><label htmlFor="new-password">Kişisel parolanız (en az 12 karakter)</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={done} /></div><button className="button primary" disabled={busy || done}>Hesabı etkinleştir</button><p role="status">{message}</p>{done && <Link href="/admin">Giriş yap</Link>}</form>;
}
