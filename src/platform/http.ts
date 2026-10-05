import { NextResponse } from 'next/server';
import { getEnvironment } from '@/lib/environment';
export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function checkOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  getEnvironment();
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(process.env.APP_BASE_URL!).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AccessError(403, 'İstek kaynağı doğrulanamadı.');
  }
}
export function apiRoute<A extends unknown[]>(handler: (request: Request, ...args: A) => Promise<Response>) {
  return async (request: Request, ...args: A) => {
    try { checkOrigin(request); const response = await handler(request, ...args); response.headers.set("Cache-Control", "private, no-store"); return response; }
    catch (error) {
      if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  };
}
