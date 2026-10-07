import {submissionStatus} from '@/components/admin-ui/status';
import {RecordDirectory} from '@/components/admin-ui/record-directory';
import Link from 'next/link';
import {requirePage} from '@/platform/context';
import {reviewList} from '@/integrations/congress/reviews';
import {stateLabels} from '@/modules/reviews/core';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('reviews.read','REVIEWS');await requirePage('reviews.read','SUBMISSIONS');const data=await reviewList();return <main className="page-shell"><section className="hero"><h1>Hakemlik yönetimi</h1><p>{data.congressName}</p><Link href="/admin/panel">Kongre paneli</Link></section><section className="card platform-card"><p>{data.total} gönderilmiş bildiri. En yeni {data.papers.length} kayıt gösteriliyor. Her bildiri kendi turları, hakemleri ve sabitlenmiş dosyasıyla değerlendirilir.</p>{!data.papers.length&&<p>Gönderilmiş bildiri yok.</p>}{<RecordDirectory label="Hakemlik bildirisi" search records={data.papers.map(p=>({id:p.id,title:p.titleTr||p.titleEn||"Bildiri",subtitle:p.id.slice(-8),state:submissionStatus(p.status),detail:<article className="content-entry" key={p.id}><h2><Link href={'/admin/hakemlik/bildiriler/'+p.id}>{p.titleTr||p.titleEn||'Bildiri'}</Link></h2><p>{p.id.slice(-8)} · {submissionStatus(p.status)}</p>{p.reviewRounds.map(r=><p key={r.number}>Tur {r.number} · {stateLabels[r.status]} · {r.assignments.length} hakem · Son tarih {new Date(r.deadline).toLocaleString('tr-TR')}</p>)}</article>}))}/>}</section></main>;}
