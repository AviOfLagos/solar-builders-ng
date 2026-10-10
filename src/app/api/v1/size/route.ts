import { body, limitIp, route, HttpError } from "@/lib/server/api";
import { CORS, readSizingInput, sizeAndRecommend, sizingRules } from "@/lib/server/quote";

/**
 * The shared calculator. GET -> the rules (appliances, presets, factors). POST { load, custom, hours, segment }
 * -> { size: { running, kw, kwh }, picks: kits that cover it }. Open to other sites, no sign-in.
 */
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

export const GET = () => Response.json(sizingRules(), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });

export const POST = route(async (req: Request) => {
  try {
    await limitIp(req, "size", 120, 600);
    return Response.json(sizeAndRecommend(readSizingInput(await body(req))), { headers: CORS });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status, headers: CORS });
    throw e;
  }
});
