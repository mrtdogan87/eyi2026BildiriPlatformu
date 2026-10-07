import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { inviteMember, listMembers } from '@/modules/identity/service';
export const GET = apiRoute(async () => NextResponse.json({ members: await listMembers() }));
export const POST = apiRoute(async request => {
  const body = await request.json();
  return NextResponse.json(await inviteMember({ email: typeof body.email === 'string' ? body.email : '', name: typeof body.name === 'string' ? body.name : '', role: body.role, roles:body.roles }));
});
