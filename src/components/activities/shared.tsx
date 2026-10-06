'use client';
import { kindLabels } from '@/modules/activities/core';
import { displayDate } from '@/components/program/shared';
export function ActivityConfirmation({en=false}:{en?:boolean}) { return <label className="checkbox-field"><input name="confirmed" type="checkbox" required/>{en?'I checked the event, seat count, fee and reason; I confirm this action.':'Etkinlik, kişi sayısı, ücret ve gerekçeyi kontrol ettim; işlemi onaylıyorum.'}</label>; }
export function ActivityReason({en=false}:{en?:boolean}) { return <label className="field">{en?'Reason':'İşlem gerekçesi'}<textarea name="reason" required minLength={8} maxLength={2000} rows={2}/></label>; }
export type ActivityCardData={kind:string;titleTr:string;titleEn:string;descriptionTr:string;descriptionEn:string;location:string;startsAt:string;endsAt:string;opensAt:string;closesAt:string;capacity:number;reservedSeats:number;waitingSeats:number;feeMinor:number;currency:string;cancelled:boolean;programChanged:boolean;available:boolean;program:{titleTr:string;titleEn:string;startsAt:string;room:string}|null};
export function ActivityInfo({event:e,en=false}:{event:ActivityCardData;en?:boolean}) { return <>
  <p>{kindLabels[e.kind]?.[en?1:0]} · {e.cancelled?(en?'Cancelled':'İptal edildi'):e.available?(en?'Booking open':'Katılım açık'):(en?'Booking closed':'Katılım kapalı')}</p>
  <h3>{en?e.titleEn||e.titleTr:e.titleTr||e.titleEn}</h3><p>{displayDate(e.startsAt,en)} — {displayDate(e.endsAt,en)} · {e.location}</p>
  <p className="review-text">{en?e.descriptionEn||e.descriptionTr:e.descriptionTr||e.descriptionEn}</p>
  <p>{en?'Reserved / capacity':'Ayrılan yer / kontenjan'}: {e.reservedSeats} / {e.capacity} · {en?'Waitlist seats':'Bekleyen kişi'}: {e.waitingSeats}</p>
  <p>{en?'Booking window':'Katılım aralığı'}: {displayDate(e.opensAt,en)} — {displayDate(e.closesAt,en)}</p>
  <p>{en?'Per attendee':'Kişi başı'}: {(e.feeMinor/100).toLocaleString(en?'en-GB':'tr-TR',{style:'currency',currency:e.currency})} · {en?'Event fees are separate from congress registration. No payment is collected here.':'Etkinlik ücreti kongre kayıt toplamından ayrıdır. Bu ekranda ödeme alınmaz.'}</p>
  {e.kind==='GALA'&&<p>{en?'Gala uses the existing congress gala fee.':'Gala mevcut kongre gala ücretini kullanır.'}</p>}
  {e.program&&<p>{en?'Related session':'Bağlı oturum'}: {en?e.program.titleEn||e.program.titleTr:e.program.titleTr} · {displayDate(e.program.startsAt,en)} · {e.program.room}</p>}
  {e.programChanged&&<p className="notice">{en?'The related programme changed. The organizer must review it before booking resumes.':'Bağlı program değişti. Katılımın açılması için organizatör kontrolü gerekiyor.'}</p>}
</>; }
