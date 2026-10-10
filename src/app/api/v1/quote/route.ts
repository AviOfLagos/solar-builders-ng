import { body, currentUser, limitIp, route, HttpError } from "@/lib/server/api";
import { CORS, readSizingInput, sizeAndRecommend } from "@/lib/server/quote";
import { saveLead } from "@/lib/server/leads";

/**
 * A quote request from any calculator (this site, the app, solarbuildersng.com).
 * Body: { name, phone, email, consent, load, custom, hours, segment, site, items?, from? }.
 * Sizes with the shared rules, saves it as a lead with the site details engineers ask about,
 * and returns the kit it matched. Items, when sent, are what the customer actually chose.
 */
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

export const POST = route(async (req: Request) => {
  try {
    await limitIp(req, "quote", 20, 3600);
    const b = await body(req);
    const result = sizeAndRecommend(readSizingInput(b));
    const items = Array.isArray(b.items) && b.items.length ? b.items : result.picks[0]?.items.map((i) => ({ id: i.id, qty: i.qty })) ?? [];
    const lead = await saveLead({ ...b, items, source: "quote", sizing: { ...result.size, hours: result.hours, rulesVersion: result.rulesVersion, from: b.from } }, await currentUser());
    return Response.json({ id: lead.id, ...result, validHours: 48, note: "Equipment price is confirmed with the supplier before payment. Installation is quoted separately by our engineer." }, { headers: CORS });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message, ...e.extra }, { status: e.status, headers: CORS });
    throw e;
  }
});
