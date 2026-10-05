import { NextRequest, NextResponse } from "next/server";
import { getEnvironment } from "@/lib/environment";
import { timingSafeEqual } from "node:crypto";

export function proxy(request: NextRequest) {
  if (getEnvironment().mode !== "preview") return NextResponse.next();
  const expected = `Basic ${Buffer.from(`${process.env.PREVIEW_ACCESS_USER}:${process.env.PREVIEW_ACCESS_PASSWORD}`).toString("base64")}`;
  const supplied = request.headers.get("authorization") ?? "";
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return new NextResponse("Test ortamına erişim için kimlik doğrulaması gerekiyor.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="AIBildiri v2 preview"', "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
