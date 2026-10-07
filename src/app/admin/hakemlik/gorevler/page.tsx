import {RecordDirectory} from '@/components/admin-ui/record-directory';
import Link from 'next/link';
import {requirePage} from '@/platform/context';
import {reviewerTasks} from '@/integrations/congress/reviews';
import {stateLabels,modeLabels} from '@/modules/reviews/core';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('reviews.perform','REVIEWS');await requirePage('reviews.perform','SUBMISSIONS');const tasks=await reviewerTasks();return <main className="page-shell"><section className="hero"><h1>Hakem görevlerim</h1><Link href="/admin/panel">Kongre paneli</Link></section><section className="card platform-card"><p>Yalnız kişisel hesabınıza atanmış görevler görünür. İlk sürüm en yeni 200 görevi listeler.</p>{!tasks.length&&<p>Atanmış hakem görevi yok.</p>}{<RecordDirectory label="Hakem görevi" search records={tasks.map(a=>({id:a.id,title:a.title,subtitle:"Tur "+a.roundNumber+" · "+modeLabels[a.mode],state:stateLabels[a.status],detail:<article className="content-entry" key={a.id}><h2><Link href={'/admin/hakemlik/gorevler/'+a.id}>{a.title}</Link></h2><p>Görev {a.id.slice(-8)} · Tur {a.roundNumber} · {modeLabels[a.mode]}</p><p>{stateLabels[a.status]} · {stateLabels[a.roundStatus]} · Son tarih {new Date(a.deadline).toLocaleString('tr-TR')}</p></article>}))}/>}</section></main>;}
