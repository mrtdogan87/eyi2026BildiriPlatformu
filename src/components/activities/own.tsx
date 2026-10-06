'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { OwnActivities } from '@/integrations/congress/activities';
import { bookingLabels } from '@/modules/activities/core';
import { request, value, check, displayDate } from '@/components/program/shared';
import { ActivityInfo, ActivityReason, ActivityConfirmation } from './shared';
export function OwnActivitiesView({initial,slug,platform=false,en=false}:{initial:OwnActivities;slug:string;platform?:boolean;en?:boolean}) {
  const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const endpoint=platform?'/api/platform/own/activities':'/api/participant/activities';
  async function act(e:FormEvent<HTMLFormElement>,action:'JOIN'|'CANCEL',event:OwnActivities['events'][number]) {
    e.preventDefault(); const f=new FormData(e.currentTarget);setBusy(true);setMessage('');
    const input=action==='JOIN'?{eventId:event.id,version:event.version,name:value(f,'name'),seats:Number(value(f,'seats')),feeMinor:event.feeMinor,currency:event.currency,locale:en?'en':'tr'}:{bookingId:event.booking!.id,version:event.booking!.version};
    try { await request(endpoint,{...(platform?{}:{congressSlug:slug}),action,input:{...input,reason:value(f,'reason'),confirmed:check(f,'confirmed')}});setData(await request<OwnActivities>(platform?endpoint:endpoint+'?congressSlug='+encodeURIComponent(slug)));setMessage(en?'Participation updated. Check your current status below.':'Katılım güncellendi. Güncel durumunuzu aşağıdan kontrol edin.'); }
    catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }
  return <section className="card platform-card"><h2>{en?'My workshops and social activities':'Workshop ve sosyal katılımım'}</h2>
    <p>{en?'Reservation, payment, attendance and certificates are separate processes.':'Yer ayrılması, ödeme, yoklama ve belge hakkı ayrı süreçlerdir.'}</p>
    <p><Link href={`/${slug}/etkinlikler`}>{en?'View published activities':'Yayımlanmış etkinlikleri aç'}</Link></p>{message&&<p role="status">{message}</p>}
    {!data.events.length&&<p>{en?'No published activities yet.':'Henüz yayımlanmış etkinlik yok.'}</p>}
    {data.events.map(e=><article className="content-entry" key={e.id+':'+e.version+':'+e.booking?.version}>
      <ActivityInfo event={e} en={en}/>{e.booking&&<><p><strong>{bookingLabels[e.booking.status]?.[en?1:0]} · {e.booking.seats} {en?'attendee(s)':'kişi'} · {en?'Order':'Sıra'} {e.booking.queueNumber}</strong></p><p>{en?'Fee when reserved':'Yer ayrılırken onaylanan kişi başı ücret'}: {e.booking.feeMinor/100} {e.booking.currency}</p>{e.booking.legacyKind&&<p>{en?'Linked from the former congress social preference. Contact the secretariat to re-link after cancellation.':'Önceki kongre sosyal tercihinden eşleştirildi. İptal sonrası yeniden eşleştirme için sekreteryaya başvurun.'}</p>}</>}
      {(!e.booking||e.booking.status==='CANCELLED')&&!e.booking?.legacyKind&&e.available&&<form onSubmit={f=>void act(f,'JOIN',e)}><fieldset disabled={busy}><label className="field">{en?'Full name':'Ad soyad'}<input name="name" required minLength={2} maxLength={300} defaultValue={e.booking?.name??''}/></label><label className="field">{en?'Attendee count':'Kişi sayısı'}<input name="seats" type="number" required min={1} max={e.kind==='WORKSHOP'?1:Math.min(10,e.capacity)} defaultValue={1}/></label><ActivityReason en={en}/><ActivityConfirmation en={en}/><button className="button primary">{en?'Reserve / join waiting list':'Yer ayır / bekleme listesine gir'}</button></fieldset></form>}
      {e.booking&&e.booking.status!=='CANCELLED'&&!e.cancelled&&<details><summary>{en?'Cancel my participation':'Katılımımı iptal et'}</summary><p>{en?'Cancellation releases your seats. A waiting group may be promoted in order.':'İptal yerinizi bırakır; bekleyen grup sıra korunarak yer alabilir.'}</p><form onSubmit={f=>void act(f,'CANCEL',e)}><fieldset disabled={busy}><ActivityReason en={en}/><ActivityConfirmation en={en}/><button className="button secondary">{en?'Confirm cancellation':'Katılım iptalini kaydet'}</button></fieldset></form></details>}
      {!!e.booking?.history.length&&<details><summary>{en?'Participation history (latest 20)':'Katılım geçmişi (son 20)'}</summary>{e.booking.history.map(h=><div className="content-entry" key={h.number}><p>{h.number} · {bookingLabels[h.toStatus]?.[en?1:0]} · {displayDate(h.createdAt,en)}</p><p className="review-text">{h.reason}</p>{h.action==='UPDATE_TERMS'&&<p>{en?'The organizer updated the activity conditions. Review the current time and location.':'Organizatör etkinlik koşullarını güncelledi. Güncel saat ve yeri kontrol edin.'}</p>}</div>)}</details>}
    </article>)}
  </section>;
}
