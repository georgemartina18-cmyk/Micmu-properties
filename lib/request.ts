import type { NextRequest } from "next/server";
// Compare against the HTTP Host actually requested by the browser. Next's internal
// origin can use a different loopback hostname behind a development reverse proxy.
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && parsed.protocol === req.nextUrl.protocol;
  } catch {
    return false;
  }
}
