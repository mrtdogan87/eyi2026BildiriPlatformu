import { NextRequest, NextResponse } from "next/server";
import { getEnvironment } from "@/lib/environment";
import { timingSafeEqual } from "node:crypto";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-congress-request-path", request.nextUrl.pathname);
  const explicitLocale = request.nextUrl.searchParams.get("lang");
  headers.delete("x-congress-request-locale");
  if (explicitLocale === "tr" || explicitLocale === "en") headers.set("x-congress-request-locale", explicitLocale);
  const next = () => {
    const response = NextResponse.next({ request: { headers } });
    return response;
  };
  if (getEnvironment().mode !== "preview") return next();
  const expected = `Basic ${Buffer.from(`${process.env.PREVIEW_ACCESS_USER}:${process.env.PREVIEW_ACCESS_PASSWORD}`).toString("base64")}`;
  const supplied = request.headers.get("authorization") ?? "";
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return new NextResponse("Test ortamına erişim için kimlik doğrulaması gerekiyor.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="AIBildiri v2 preview"', "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const response = next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
