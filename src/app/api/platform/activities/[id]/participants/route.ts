import { apiRoute } from '@/platform/http';
import { activityParticipantsCsv } from '@/integrations/congress/activities';
export const GET = apiRoute(async (_request, { params }: { params: Promise<{ id: string }> }) => new Response(await activityParticipantsCsv((await params).id), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="activity-participants.csv"', 'X-Content-Type-Options': 'nosniff' } }));
