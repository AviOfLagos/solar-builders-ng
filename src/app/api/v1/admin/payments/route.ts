import { body, ok, route, requireTeam } from "@/lib/server/api";
import { paymentsOpen, setPaymentsOpen } from "@/lib/server/switch";
import { db } from "@/lib/server/db";

const state = async () => {
  const sql = await db();
  const [r] = await sql`select count(*)::int as n, coalesce(sum(total_paid),0)::int as total from orders where status not in ('awaiting_payment','expired','cancelled')`;
  return { open: await paymentsOpen(), forcedOff: process.env.PAYMENTS_ENABLED === "false", paidOrders: r.n, paidTotal: r.total };
};

export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok(await state());
});

/** Body: { open: boolean }. Turning it off stops new charges at once; payments already in flight still get recorded. */
export const POST = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const b = await body<{ open: boolean }>(req);
  await setPaymentsOpen(b.open === true);
  return ok(await state());
});
