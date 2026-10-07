import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { updateMember, resendActivation } from '@/modules/identity/service';
export const PATCH = apiRoute(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; const body = await request.json();
  return NextResponse.json(await updateMember(id, { role: body.role, roles:body.roles, active: body.active }));
});

export const POST = apiRoute(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; return NextResponse.json(await resendActivation(id));
});
