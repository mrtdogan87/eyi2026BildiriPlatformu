import Link from 'next/link';
import { redirect } from 'next/navigation';
import { actorSession, requireContext, moduleEnabled } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { allows, roleLabels } from '@/platform/policy';
import { creationOrganizations } from '@/modules/congress/service';
import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
export const dynamic = 'force-dynamic';
export default async function PanelPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  if (!(await actorSession())) redirect('/admin');
  const canCreate = (await creationOrganizations()).length > 0;
  let context; try { context = await requireContext(); } catch (error) { if (!(error instanceof AccessError)) throw error; }
  if (!context) return <main className="page-shell"><section className="card platform-card"><h1>Kongre seçin</h1><p>Üst menüden erişiminiz olan kongrelerden birini seçin. Üyeliğiniz kaldırıldıysa kongre yönetimiyle görüşün.</p>{canCreate && <Link className="button primary" href="/admin/kongre-olustur">Yeni kongre oluştur</Link>}<AdminLogoutButton /></section></main>;
  const submissions = await moduleEnabled(context.congress.id, 'SUBMISSIONS'); const registration = await moduleEnabled(context.congress.id, 'REGISTRATION');const cms=await moduleEnabled(context.congress.id,'CMS');
  const links = [
    ['payments.read', registration, '/admin/odemeler', 'Ödeme doğrulama ve banka ekstresi'],
    ['worklist', true, '/admin/is-listesi', 'Sekreterya iş listesi'],
    ['communications', true, '/admin/iletisim', 'E-posta ve teslim sorunları'],
    ['submissions.read', submissions, '/admin/bildiriler', 'Bildiriler'], ['registrations.read', registration, '/admin/kayitlar', 'Kayıtlar'],
    ['cms', cms, '/admin/icerik', 'Ortak içerik kayıtları'], ['feedback', cms, '/admin/talepler', 'Geri bildirim talepleri'], ['cms', cms, '/admin/cms', 'CMS sayfaları'], ['cms', cms, '/admin/cms/medya', 'Medya kitaplığı'], ['settings', true, '/admin/site-gorunumu', 'Site görünümü'], ['settings', true, '/admin/kongre-ayarlari', 'Kongre yapılandırması'], ['settings', true, '/admin/teslim-istisnalari', 'Teslim istisnaları'], ['settings', registration, '/admin/ucretler', 'Ücretler'], ['members', true, '/admin/ekip', 'Ekip ve roller'],
    ['modules', true, '/admin/moduller', 'Modüller'], ['audit', true, '/admin/islem-gecmisi', 'İşlem geçmişi'], ['own', true, '/admin/kayitlarim', 'Kendi kayıtlarım'],
  ] as const;
  return <main className="page-shell admin-page-shell"><section className="hero admin-hero"><div><p>{context.congress.organization.name}</p><h1>{context.congress.name}</h1><p>Rolünüz: {context.role === 'PLATFORM_ADMIN' ? 'Platform yöneticisi' : roleLabels[context.role]}</p></div><AdminLogoutButton /></section>{(await searchParams).denied && <p className="error" role="alert">İstediğiniz işlem için yetkiniz yok veya ilgili modül kapalı.</p>}{canCreate && <p><Link className="button primary" href="/admin/kongre-olustur">Yeni kongre oluştur</Link></p>}<section className="platform-grid">{links.filter(([action, enabled]) => enabled && allows(context.role, action)).map(([, , href, label]) => <Link className="card platform-tile" href={href} key={href}><h2>{label}</h2><span>Aç →</span></Link>)}</section>{['REVIEWER', 'SESSION_CHAIR'].includes(context.role) && <p>Rolünüze ait çalışma ekranları ilgili modülün geliştirme paketinde açılacak.</p>}{!cms&&context.role==='CONTENT_EDITOR'&&<p>CMS modülü kapalı. Kongre organizatörü Modüller ekranından açabilir.</p>}<p><Link href={`/${context.congress.slug}`}>Katılımcı sayfasını aç</Link></p></main>;
}
