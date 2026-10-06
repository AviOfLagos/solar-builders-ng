import { createHmac, timingSafeEqual } from "node:crypto";
import { fail, ok, route, HttpError } from "@/lib/server/api";
import { setOrderStatus } from "@/lib/server/orders";
import { assignJob, createPO, fulfilmentFlags, marginSummary, orderFulfilment, poMessage, sendPO, updatePO } from "@/lib/server/fulfilment";
import { brief, listProspects, outboundLog, saveProspect, sendOutbound, updateLead } from "@/lib/server/agent-ops";

export const maxDuration = 30;

/** The key shared by the site and the assistant (same project, same env). AGENT_SECRET overrides it. */
const key = () => process.env.AGENT_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

/**
 * The assistant's hands. Only the assistant can call this: requests are signed with a key only the
 * deployment knows, are valid for 60 seconds, and name the team member who approved the action.
 * Money (refunds, payouts) is deliberately not here: a person does those in the admin.
 */
export const POST = route(async (req: Request) => {
  const raw = await req.text();
  const ts = Number(req.headers.get("x-agent-ts"));
  const sig = req.headers.get("x-agent-sig") ?? "";
  const k = key();
  if (!k || !Number.isFinite(ts) || Math.abs(Date.now() - ts) > 60_000) return fail("Not allowed.", 403);
  const want = createHmac("sha256", k).update(`${ts}.${raw}`).digest("hex");
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return fail("Not allowed.", 403);

  const b = JSON.parse(raw) as Record<string, unknown> & { action: string; actor: string };
  const actor = String(b.actor || "assistant").slice(0, 120);
  const s = (v: unknown, n = 80) => String(v ?? "").slice(0, n);
  switch (b.action) {
    case "brief": return ok({ items: await brief() });
    case "flags": return ok({ flags: await fulfilmentFlags(), margin: await marginSummary(30) });
    case "order.fulfilment": return ok(await orderFulfilment(s(b.orderId)));
    case "order.status": return ok(await setOrderStatus(s(b.orderId), s(b.status, 30)));
    case "lead.update": return ok(await updateLead(s(b.leadId), b));
    case "po.create": return ok({ id: await createPO(s(b.orderId), s(b.supplierId), { shipTo: s(b.shipTo, 10), deliveryCost: b.deliveryCost, note: b.note }, actor) });
    case "po.message": { const m = await poMessage(s(b.poId)); return ok({ text: m.text, wa: m.wa, email: m.email }); }
    case "po.send": { const m = await sendPO(s(b.poId), "email"); return ok({ sent: true, wa: m.wa }); }
    case "po.update": await updatePO(s(b.poId), b); return ok({ updated: true });
    case "job.assign": await assignJob(s(b.orderId), s(b.installerId), b); return ok({ assigned: true });
    case "prospects.list": return ok({ prospects: await listProspects(s(b.status, 20), b.due === true) });
    case "prospect.save": return ok({ id: await saveProspect(b) });
    case "email.send": return ok(await sendOutbound(b, actor));
    case "log": return ok({ log: await outboundLog(Math.min(50, Number(b.limit) || 20)) });
    default: throw new HttpError(400, "Unknown action.");
  }
});
