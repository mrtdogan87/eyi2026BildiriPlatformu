import {requirePage} from '@/platform/context';
import {promotionManager} from '@/integrations/congress/promotion';
import {PromotionView} from '@/components/promotion/manager';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('promotion.read','PROMOTION');return <main className="page-shell admin-page-shell"><PromotionView initial={await promotionManager()}/></main>;}
