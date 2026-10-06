import { body, ok, route, requireTeam, str } from "@/lib/server/api";
import { markPayout, payouts, payoutsCsv } from "@/lib/server/fulfilment";

export const GET = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  if (new URL(req.url).searchParams.get("format") === "csv")
    return new Response(await payoutsCsv(), { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="commission-payouts.csv"' } });
  return ok(await payouts());
});

export const POST = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const b = await body(req);
  await markPayout(str(b.orderId, 40), str(b.status, 20), str(b.ref, 100));
  return ok(await payouts());
});
