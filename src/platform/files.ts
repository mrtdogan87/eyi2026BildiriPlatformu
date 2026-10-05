import { NextResponse } from 'next/server';
// Modules authorize a congress/owner first and pass the resulting binary payload to this port.
export function privateFile(content: Uint8Array, mimeType: string, originalName: string) {
  return new NextResponse(new Uint8Array(content), { headers: {
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
