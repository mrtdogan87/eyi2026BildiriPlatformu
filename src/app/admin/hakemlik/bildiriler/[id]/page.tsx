import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requirePage} from '@/platform/context';
import {AccessError} from '@/platform/http';
import {reviewDetail} from '@/integrations/congress/reviews';
import {ReviewManager} from '@/components/reviews/manager';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){await requirePage('reviews.read','REVIEWS');await requirePage('reviews.read','SUBMISSIONS');let data;try{data=await reviewDetail((await params).id);}catch(e){if(e instanceof AccessError&&e.status===404)notFound();throw e;}return <main className="page-shell"><p><Link href="/admin/hakemlik">Hakemlik listesine dön</Link></p><ReviewManager initial={data}/></main>;}
