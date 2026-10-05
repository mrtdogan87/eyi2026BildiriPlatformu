import { NextResponse } from 'next/server';
import { actorSession, availableContexts } from '@/platform/context';
import { AccessError, apiRoute } from '@/platform/http';
import { selectContext } from '@/modules/identity/service';
export const GET = apiRoute(async () => {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  const contexts = await availableContexts(session.userId);
  return NextResponse.json({ actor: { name: session.user.name, email: session.user.email }, selectedCongressId: session.congressId, contexts: contexts.map(c => ({ id: c.id, name: c.name, organization: c.organization.name, slug: c.slug })) });
});
export const POST = apiRoute(async request => {
  const body = await request.json(); if (typeof body.congressId !== 'string') throw new AccessError(400, 'Kongre seçin.');
  await selectContext(body.congressId); return NextResponse.json({ ok: true });
});
