'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

async function submit(url: string, body: Record<string, string>) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'İşlem tamamlanamadı. Lütfen yeniden deneyin.');
  return result as { message?: string };
}

export function PasswordRecoveryRequestForm() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const feedback = useRef<HTMLParagraphElement>(null);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await submit('/api/platform/password-recovery', { email: String(values.get('email') ?? '') });
      setMessage(result.message ?? 'İsteğiniz alındı.');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'İşlem tamamlanamadı.'); }
    finally { setBusy(false); requestAnimationFrame(() => feedback.current?.focus()); }
  }
  return <form className="card platform-card" onSubmit={send} aria-busy={busy}>
    <h1>Parolamı unuttum</h1>
    <p>Kişisel hesabınızın e-posta adresini yazın. Parola yenileme bağlantısı 30 dakika geçerlidir ve bir kez kullanılabilir.</p>
    <p>Henüz parola oluşturmadıysanız size gönderilen daveti kullanın veya yöneticinizden yeni davet isteyin.</p>
    <div className="field"><label htmlFor="recovery-email">E-posta</label><input id="recovery-email" name="email" type="email" autoComplete="username" inputMode="email" spellCheck={false} placeholder="ad.soyad@example.com" aria-describedby="recovery-email-hint" maxLength={254} required disabled={busy} /><span id="recovery-email-hint" className="field-hint">Hesabınıza kayıtlı e-posta adresini kullanın.</span></div>
    <div className="form-actions"><button className="button primary" disabled={busy}>{busy ? 'İstek alınıyor…' : 'Parola yenileme bağlantısı iste'}</button><Link href="/admin">Girişe dön</Link></div>
    <p ref={feedback} tabIndex={-1} role={error ? 'alert' : 'status'} className={error ? 'error' : undefined}>{error || message}</p>
  </form>;
}

export function PasswordResetForm() {
  const [token, setToken] = useState<string | null>(null), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('');
  const feedback = useRef<HTMLParagraphElement>(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    setToken(fragment.get('token') ?? '');
    // The token never reaches request/access logs and is removed from browser history.
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const password = String(values.get('password') ?? '');
    if (password !== values.get('confirmation')) { setError('Parolalar eşleşmiyor.'); requestAnimationFrame(() => feedback.current?.focus()); return; }
    setBusy(true); setError('');
    try { await submit('/api/platform/password-reset', { token: token ?? '', password }); setDone(true); setToken(''); form.reset(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Parola yenilenemedi.'); }
    finally { setBusy(false); requestAnimationFrame(() => feedback.current?.focus()); }
  }
  const validLink = token !== null && /^[a-f0-9]{64}$/.test(token);
  return <form className="card platform-card" onSubmit={save} aria-busy={busy}>
    <h1>Parolanızı yenileyin</h1>
    {token === null ? <p role="status">Bağlantı hazırlanıyor…</p> : !validLink && !done ? <p role="alert">Geçerli bir parola yenileme bağlantısı açın veya yeni bağlantı isteyin.</p> : null}
    {!done && validLink && <>
      <p>Yeni parolanız 12–256 karakter olmalı. Kaydettikten sonra açık oturumlarınız kapanır; yeni parolanızla giriş yapabilirsiniz.</p>
      <div className="field"><label htmlFor="recovery-password">Yeni parola</label><input id="recovery-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={busy} /></div>
      <div className="field"><label htmlFor="recovery-confirmation">Yeni parola tekrar</label><input id="recovery-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={busy} /></div>
      <button className="button primary" disabled={busy}>{busy ? 'Parola yenileniyor…' : 'Parolayı yenile'}</button>
    </>}
    <p ref={feedback} tabIndex={-1} role={error ? 'alert' : 'status'} className={error ? 'error' : undefined}>{error || (done ? 'Parolanız yenilendi. Yeni parolanızla giriş yapabilirsiniz.' : '')}</p>
    <div className="form-actions"><Link href="/admin">Girişe dön</Link>{!done && <Link href="/hesap/parolami-unuttum">Yeni bağlantı iste</Link>}</div>
  </form>;
}
