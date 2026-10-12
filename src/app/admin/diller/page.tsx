import {redirect} from 'next/navigation';
import {AccessError} from '@/platform/http';
import {translationOverview} from '@/modules/translations/service';
import {TranslationManager} from '@/components/translations/manager';
export const dynamic='force-dynamic';
export default async function Page(){
 let data;
 try{data=await translationOverview();}catch(error){if(error instanceof AccessError)redirect(error.status===401?'/admin':'/admin/panel?denied=1');throw error;}
 return <main className="page-shell"><section className="hero"><h1>Dil ve çeviriler</h1><p>{data.name} · Türkçe ve İngilizce içerik yönetimi</p></section><section className="card platform-card"><TranslationManager key={data.congressId} initial={data}/></section></main>;
}
