import { db } from "@/lib/server/db";
import { ok, fail, body, route, currentUser, isTeam, requireUser } from "@/lib/server/api";
import { updateProfile, deleteAccount } from "@/lib/server/account";
import { clearSession } from "@/lib/server/session";
import { savedCards, payOptions } from "@/lib/server/pay";

export const GET = route(async () => {
  const s = await currentUser();
  if (!s) return ok({ user: null, cards: [], store: null, lastDelivery: null, team: false, pay: payOptions() });
  const sql = await db();
  const [u] = await sql`select id, email, name, phone, google_sub, email_verified_at is not null as verified, password_hash is not null as has_password from users where id = ${s.uid}`;
  const [store] = await sql`select slug, name, kind, commission_bps from stores where user_id = ${s.uid}`;
  const [last] = await sql`select delivery, recipient from orders where user_id = ${s.uid} and pool_id is null and status <> 'awaiting_payment' and recipient is null order by created_at desc limit 1`;
  const d = last?.delivery;
  return ok({
    user: { id: u.id, email: u.email, name: u.name, phone: u.phone, google: !!u.google_sub, hasPassword: u.has_password, verified: u.verified },
    cards: await savedCards(s.uid), store: store ?? null, team: await isTeam(s), pay: payOptions(),
    lastDelivery: d ? { address: d.address, lga: d.lga, landmark: d.landmark, altPhone: d.altPhone } : null,
  });
});

/** Edit name and/or phone: { name?, phone? }. */
export const PATCH = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  return ok(await updateProfile(s.uid, await body(req)));
});

/** Delete my account. Body must be { confirm: "DELETE" } so it can't happen by accident. */
export const DELETE = route(async (req: Request) => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  if ((await body<{ confirm: string }>(req)).confirm !== "DELETE") return fail('Send { "confirm": "DELETE" } to delete the account.');
  const r = await deleteAccount(s.uid);
  await clearSession();
  return ok(r);
});
