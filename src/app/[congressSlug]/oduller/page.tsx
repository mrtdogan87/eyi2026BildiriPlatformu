import {notFound} from 'next/navigation';
import {publicAwards} from '@/integrations/congress/awards';
import {publicSite} from '@/integrations/congress/site-data';
import {getLocale} from '@/lib/i18n/server';
import {AccessError} from '@/platform/http';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{congressSlug:string}>}){
 const {congressSlug}=await params,{workflow}=await publicSite(congressSlug),en=(await getLocale(workflow.languages))==='en';let data;try{data=await publicAwards(congressSlug);}catch(e){if(e instanceof AccessError&&[403,404].includes(e.status))notFound();throw e;}
 return <main id="congress-content" className="site-width program-page" tabIndex={-1}><section className="card platform-card"><h1>{en?'Award results':'Ödül sonuçları'}</h1><p>{data.congressName}</p><p>{en?'Only current, published committee decisions appear here. Jury scores and private evaluation files are not public.':'Yalnız güncel ve yayımlanmış kurul kararları burada görünür. Jüri puanları ve özel değerlendirme dosyaları paylaşılmaz.'}</p>{!data.results.length&&<p>{en?'No published committee decision.':'Yayımlanmış kurul kararı yok.'}</p>}{data.results.map(r=><article className="content-entry" key={r.category+':'+r.number}><h2>{r.category}</h2><p>{en?'Decision version':'Karar sürümü'} {r.number}</p>{!r.current?<p>{en?'The source or evaluation changed; the committee must confirm a new decision.':'Kaynak veya değerlendirme değişti; kurulun yeni kararı bekleniyor.'}</p>:<ol>{r.winners.map((w,i)=><li key={i}>{w.place}. {w.label} · {w.name} · {w.title}</li>)}</ol>}</article>)}</section></main>;
}
