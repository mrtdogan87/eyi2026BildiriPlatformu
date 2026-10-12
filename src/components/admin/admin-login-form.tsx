"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [serverRetryAt, setServerRetryAt] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const remaining = retryAt ? Math.max(0, Math.ceil((retryAt - clock) / 1000)) : 0;
  const waiting = remaining > 0;
  const retryTime = serverRetryAt ? new Date(serverRetryAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : '';

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= retryAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || waiting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { error?: string; redirectTo?:string; code?:string; retryAt?:string; retryAfterSeconds?:number };
      if (response.status === 429 && data.code === 'LOGIN_COOLDOWN') {
        // Count down from the server's remaining duration, independent of the
        // browser clock. The server still enforces the wait after a reload.
        const seconds = Number(response.headers.get('Retry-After') ?? data.retryAfterSeconds);
        if (Number.isFinite(seconds) && seconds > 0) {
          const now = Date.now();
          setClock(now);
          setRetryAt(now + seconds * 1000);
          setServerRetryAt(data.retryAt && Number.isFinite(Date.parse(data.retryAt)) ? data.retryAt : new Date(now + seconds * 1000).toISOString());
          return;
        }
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Giriş başarısız.");
      }

      router.push(data.redirectTo ?? "/admin/panel");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Giriş başarısız.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card admin-login-card" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <h2 className="section-title">Kişisel Hesap Girişi</h2>
      <div className="field"><label htmlFor="admin-email">E-posta</label><input id="admin-email" type="email" autoComplete="username" inputMode="email" spellCheck={false} maxLength={254} placeholder="ad.soyad@example.com" aria-describedby="admin-email-hint" value={email} onChange={e => { setEmail(e.target.value); setRetryAt(null); setError(''); }} required disabled={isSubmitting} /><span id="admin-email-hint" className="field-hint">Davet aldığınız veya hesabınıza kayıtlı e-posta adresini yazın.</span></div>
      <div className="field">
        <label htmlFor="admin-password">Parola</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Şifrenizi girin"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          maxLength={256}
        />
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {retryAt && <div className="notice login-cooldown">
        <p role="status">{waiting ? <>Çok sayıda başarısız giriş denemesi nedeniyle kısa bir bekleme uygulanıyor. {retryTime} (Türkiye saati) sonrasında yeniden deneyebilirsiniz.</> : 'Bekleme süresi doldu. E-posta ve parolanızı kontrol ederek yeniden giriş yapabilirsiniz.'}</p>
        {waiting && <p aria-live="off">Kalan süre: <strong>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</strong>. Bu geçici bir güvenlik önlemidir; süre dolunca giriş düğmesi yeniden açılır.</p>}
      </div>}
      <div className="form-actions admin-login-actions">
        <button className="button primary" type="submit" disabled={isSubmitting || waiting}>
          {isSubmitting ? "Giriş yapılıyor..." : waiting ? "Bekleme süresi devam ediyor" : "Panele Gir"}
        </button>
        <Link href="/hesap/parolami-unuttum">Parolamı unuttum</Link>
      </div>
    </form>
  );
}
