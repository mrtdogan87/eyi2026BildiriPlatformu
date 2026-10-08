import { NextResponse } from 'next/server';
import { actorSession, availableContexts } from '@/platform/context';
import { AccessError, apiRoute } from '@/platform/http';
import { selectContext,clearContext } from '@/modules/identity/service';
import {hasIntervention} from '@/platform/intervention.mjs';
export const GET = apiRoute(async () => {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  const active=hasIntervention(session);
  const contexts = await availableContexts(session.userId,active?session.congressId!:undefined);
  return NextResponse.json({ actor: { name: session.user.name, email: session.user.email }, selectedCongressId:session.user.platformAdmin&&!active?null:session.congressId, intervention:active?{reason:session.interventionReason,startedAt:session.interventionStartedAt}:null, contexts: contexts.map(c => ({ id: c.id, name: c.name, organization: c.organization.name, slug: c.slug })) });
});
export const POST = apiRoute(async request => {
  const body = await request.json(); if (typeof body.congressId !== 'string') throw new AccessError(400, 'Kongre seçin.');
  await selectContext(body.congressId,body.reason); return NextResponse.json({ ok: true });
});
export const DELETE=apiRoute(async()=>{await clearContext();return NextResponse.json({ok:true});});
