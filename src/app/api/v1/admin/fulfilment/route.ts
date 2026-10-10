import { body, fail, ok, route, requireTeam, str } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { offerJob, assignJob, createPO, fulfilmentFlags, listInstallers, listSuppliers, orderFulfilment, poMessage, sendPO, updateJob, updatePO } from "@/lib/server/fulfilment";

/** GET ?order=ID -> that order's purchase orders, installer job and margin (plus who we can pick). GET with no order -> late flags. */
export const GET = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const order = str(new URL(req.url).searchParams.get("order"), 40);
  if (!order) return ok({ flags: await fulfilmentFlags() });
  const [f, suppliers, installers] = await Promise.all([orderFulfilment(order), listSuppliers(), listInstallers()]);
  return ok({ ...f, suppliers: suppliers.filter((x) => x.active), installers: installers.filter((x) => x.active) });
});

/** POST { action, ... }. One door for every fulfilment step so the order drawer stays simple. */
export const POST = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const b = await body(req);
  const sql = await db();
  const [u] = await sql`select email from users where id = ${s.uid}`;
  const by = String(u?.email ?? "");
  const orderId = str(b.orderId, 40);
  const poId = str(b.poId, 40);
  switch (b.action) {
    case "po.create": await createPO(orderId, str(b.supplierId, 40), { shipTo: str(b.shipTo, 10), deliveryCost: b.deliveryCost, note: b.note }, by); break;
    case "po.send": { const m = await sendPO(poId, b.channel === "email" ? "email" : "manual"); return ok({ wa: m.wa, ...(await orderFulfilment(m.po.order_id)) }); }
    case "po.message": { const m = await poMessage(poId); return ok({ text: m.text, wa: m.wa, email: m.email }); }
    case "po.update": await updatePO(poId, b); break;
    case "job.assign": await assignJob(orderId, str(b.installerId, 40), b); break;
    case "job.update": await updateJob(orderId, b); break;
    case "job.offer": { const m = await offerJob(orderId, str(b.installerId, 40), by); return ok({ wa: m.wa, ...(await orderFulfilment(orderId)) }); }
    default: return fail("Unknown action.");
  }
  let o = orderId;
  if (!o && poId) { const [p] = await sql`select order_id from purchase_orders where id = ${poId}`; o = p?.order_id ?? ""; }
  return ok(await orderFulfilment(o));
});
