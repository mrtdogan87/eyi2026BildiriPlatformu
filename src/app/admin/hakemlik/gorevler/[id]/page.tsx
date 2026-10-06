import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requirePage} from '@/platform/context';
import {AccessError} from '@/platform/http';
import {reviewerDetail} from '@/integrations/congress/reviews';
import {ReviewerManager} from '@/components/reviews/reviewer';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){await requirePage('reviews.perform','REVIEWS');await requirePage('reviews.perform','SUBMISSIONS');let data;try{data=await reviewerDetail((await params).id);}catch(e){if(e instanceof AccessError&&e.status===404)notFound();throw e;}return <main className="page-shell"><p><Link href="/admin/hakemlik/gorevler">Hakem görevlerime dön</Link></p><ReviewerManager initial={data}/></main>;}
