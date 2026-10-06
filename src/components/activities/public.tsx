import Link from 'next/link';
import type { publicActivities } from '@/integrations/congress/activities';
import { ActivityInfo } from './shared';
export function PublicActivities({initial,slug,en}:{initial:Awaited<ReturnType<typeof publicActivities>>;slug:string;en:boolean}) { return <>
  <p>{en?'Workshops & social events':'Workshop ve sosyal etkinlikler'}</p><h1>{initial.congressName}</h1>
  <p>{en?'Reserve or cancel your own place from your email-verified participant panel. Groups remain together on the waiting list. All times are Europe/Istanbul.':'E-posta doğrulanmış katılımcı panelinizden kendi yerinizi ayırabilir veya iptal edebilirsiniz. Gruplar bekleme sırasında bölünmez. Saatler İstanbul saatidir.'}</p>
  <p><Link className="button primary" href={`/${slug}/katilimci`}>{en?'Open my participant panel':'Katılımcı panelimi aç'}</Link></p>
  {!initial.events.length&&<p>{en?'No published events yet.':'Henüz yayımlanmış etkinlik yok.'}</p>}
  <div className="activity-grid">{initial.events.map(e=><article className="card platform-card" key={e.id}><ActivityInfo event={e} en={en}/></article>)}</div>
</>; }
