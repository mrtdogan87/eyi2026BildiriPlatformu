'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cmsRequest } from '@/components/cms/admin-shared';
export function ParticipantAccess({ slug, locale, token }: { slug: string; locale: 'tr' | 'en'; token?: string }) {
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const router = useRouter(), en = locale === 'en';
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (token) { await cmsRequest('/api/participant/verify', 'POST', { congressSlug: slug, token }); router.replace(`/${slug}/katilimci/panel`); router.refresh(); }
      else { await cmsRequest('/api/participant/access', 'POST', { congressSlug: slug, email, locale }); setMessage(en ? 'Your access link has been queued. Check your email. It is valid for 24 hours and can be used once.' : 'Panel bağlantınız kuyruğa alındı. E-postanızı kontrol edin. Bağlantı 24 saat geçerlidir ve bir kez kullanılabilir.'); }
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="form-stack" onSubmit={submit}><p>{en ? 'Verify your email to view your records for this congress. This does not create a staff account.' : 'Bu kongredeki kendi kayıtlarınızı görmek için e-posta adresinizi doğrulayın. Bu işlem ekip hesabı oluşturmaz.'}</p>{!token && <label className="field">{en ? 'Email' : 'E-posta'}<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" spellCheck={false} placeholder={en ? 'name.surname@example.com' : 'ad.soyad@example.com'} aria-describedby="participant-email-hint" /><span className="field-hint" id="participant-email-hint">{en ? 'Enter the email address used for your submission or registration. Your panel link will be sent here.' : 'Bildiri veya katılım kaydında kullandığınız e-posta adresini girin. Panel bağlantısı bu adrese gönderilir.'}</span></label>}<button className="button primary" disabled={busy}>{token ? (en ? 'Verify and open my panel' : 'Doğrula ve panelimi aç') : (en ? 'Request panel link' : 'Panel bağlantısı iste')}</button>{token && <Link href={`/${slug}/katilimci`}>{en ? 'Request a new link' : 'Yeni bağlantı iste'}</Link>}{message && <p role="status">{message}</p>}</form>;
}
