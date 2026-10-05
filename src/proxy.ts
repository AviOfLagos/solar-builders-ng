import { NextResponse, type NextRequest } from "next/server";

/**
 * Lets the app's browser preview (`npm run web` on localhost) call the API.
 * - Only localhost origins, only /api/v1.
 * - No Access-Control-Allow-Credentials, so browsers never send the website's session cookie
 *   cross-origin. The app authenticates with a Bearer token instead.
 */
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/;
const CORS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};

export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  if (!LOCAL.test(origin)) return NextResponse.next();
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, ...CORS } });
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", origin);
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/v1/:path*" };
