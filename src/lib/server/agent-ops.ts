import "server-only";
import { db, id } from "./db";
import { HttpError } from "./api";
import { esc, sendMail, shell } from "./mail";
import { fulfilmentFlags, payouts } from "./fulfilment";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const SITE = () => process.env.SITE_URL || "https://solar.nexprove.com";

export const PROSPECT_STATUS = ["new", "contacted", "replied", "won", "lost"] as const;
export const PROSPECT_KIND = ["distributor", "installer", "brand", "reseller", "other"] as const;
/** Cold emails per day. Protects the sending domain and keeps us on the right side of spam rules. */
const OUTREACH_PER_DAY = 15;

// ---- prospects ----

export async function listProspects(status: string, due: boolean) {
  const sql = await db();
  return sql`select id, name, kind, email, phone, instagram, linkedin, website, status, notes, last_contacted_at, follow_up_on, stop from prospects
    where (${status} = '' or status = ${status}) and (not ${due} or (follow_up_on <= current_date and not stop and status in ('new', 'contacted')))
    order by coalesce(follow_up_on, current_date), created_at desc limit 100`;
}

export async function saveProspect(b: Record<string, unknown>) {
  const sql = await db();
  const name = clean(b.name, 100);
  if (name.length < 2) throw new HttpError(400, "A prospect needs a name.");
  const kind = (PROSPECT_KIND as readonly string[]).includes(clean(b.kind, 20)) ? clean(b.kind, 20) : "distributor";
  const email = clean(b.email, 120).toLowerCase();
  if (email && !isEmail(email)) throw new HttpError(400, "That email doesn't look right.");
  const status = clean(b.status, 20);
  if (status && !(PROSPECT_STATUS as readonly string[]).includes(status)) throw new HttpError(400, "Unknown status.");
  const follow = clean(b.followUpOn, 10);
  if (follow && !/^\d{4}-\d{2}-\d{2}$/.test(follow)) throw new HttpError(400, "Use a date like 2026-10-20.");
  const f = { phone: clean(b.phone, 30), instagram: clean(b.instagram, 80), linkedin: clean(b.linkedin, 200), website: clean(b.website, 200), notes: clean(b.notes, 1000) };
  if (b.id) {
    const [r] = await sql`update prospects set name = ${name}, kind = ${kind}, email = coalesce(nullif(${email}, ''), email), phone = coalesce(nullif(${f.phone}, ''), phone),
        instagram = coalesce(nullif(${f.instagram}, ''), instagram), linkedin = coalesce(nullif(${f.linkedin}, ''), linkedin), website = coalesce(nullif(${f.website}, ''), website),
        status = coalesce(${status || null}, status), notes = case when ${f.notes} = '' then notes else ${f.notes} end, follow_up_on = coalesce(${follow || null}::date, follow_up_on),
        stop = case when ${status} in ('lost') then true else stop end
      where id = ${String(b.id)} returning id`;
    if (!r) throw new HttpError(404, "Prospect not found.");
    return r.id as string;
  }
  if (email) { const [dup] = await sql`select id from prospects where email = ${email}`; if (dup) throw new HttpError(409, `Already in the list (${dup.id}).`, { id: dup.id }); }
  const pid = id();
  await sql`insert into prospects (id, name, kind, email, phone, instagram, linkedin, website, status, notes, follow_up_on)
    values (${pid}, ${name}, ${kind}, ${email}, ${f.phone}, ${f.instagram}, ${f.linkedin}, ${f.website}, ${status || "new"}, ${f.notes}, ${follow || null}::date)`;
  return pid;
}

// ---- outbound email ----

/**
 * One door for every email the assistant sends. Customer mail must go to an address already on an
 * order or lead (and a lead must have agreed to be contacted). Cold outreach goes to a saved prospect,
 * is capped per day, always says who we are, and stops for anyone marked stop.
 */
export async function sendOutbound(b: Record<string, unknown>, actor: string) {
  const sql = await db();
  const kind = clean(b.kind, 20);
  const subject = clean(b.subject, 150);
  const text = clean(b.body, 4000);
  if (subject.length < 3 || text.length < 10) throw new HttpError(400, "Add a subject and a message.");
  let to = "", ref = "", footer = "";
  if (kind === "customer") {
    const email = clean(b.to, 120).toLowerCase();
    const [o] = await sql`select id from orders where lower(buyer->>'email') = ${email} limit 1`;
    const [l] = o ? [] : await sql`select id, consent from leads where lower(email) = ${email} limit 1`;
    if (!o && !l) throw new HttpError(400, "That address isn't on any order or lead.");
    if (!o && l && !l.consent) throw new HttpError(409, "This lead hasn't agreed to be contacted. Don't email them; use what they gave you (WhatsApp) only if they asked.");
    to = email; ref = o ? `order:${o.id}` : `lead:${l!.id}`;
    footer = `<p style="color:#6b756f;font-size:12px">Solar Builders NG · Lagos. Just reply to this email to reach us.</p>`;
    if (l) await sql`update leads set status = case when status = 'new' then 'contacted' else status end, contacted_at = coalesce(contacted_at, now()), updated_at = now() where id = ${l.id}`;
  } else if (kind === "outreach") {
    const [p] = await sql`select id, email, stop, status from prospects where id = ${clean(b.prospectId, 40)}`;
    if (!p) throw new HttpError(404, "Save them as a prospect first.");
    if (!p.email) throw new HttpError(400, "This prospect has no email.");
    if (p.stop || p.status === "lost") throw new HttpError(409, "They asked us to stop or were marked lost. Don't email them.");
    const [n] = await sql`select count(*)::int as n from outbound_log where kind = 'outreach' and sent and at > now() - interval '24 hours'`;
    if (n.n >= OUTREACH_PER_DAY) throw new HttpError(429, `Daily outreach limit (${OUTREACH_PER_DAY}) reached. Try tomorrow.`);
    to = p.email; ref = `prospect:${p.id}`;
    footer = `<p style="color:#6b756f;font-size:12px">Solar Builders NG (Nexprove Limited), Lagos. We're writing about a possible supply partnership. If this isn't for you, reply "stop" and we won't write again.</p>`;
  } else throw new HttpError(400, "kind must be customer or outreach.");

  const lid = id();
  const html = shell(subject, text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") + footer);
  const r = await sendMail({ to: [to], subject, html, text });
  await sql`insert into outbound_log (id, kind, recipient, subject, body, actor, ref, sent) values (${lid}, ${kind}, ${to}, ${subject}, ${text}, ${actor}, ${ref}, ${r.ok})`;
  if (!r.ok) throw new HttpError(502, r.off ? "Email isn't set up yet (RESEND_API_KEY). Nothing was sent; the message is saved in the log." : "The email didn't go through.");
  if (kind === "outreach") await sql`update prospects set status = case when status = 'new' then 'contacted' else status end, last_contacted_at = now(), follow_up_on = current_date + 4 where id = ${ref.slice(9)}`;
  return { sent: true, to, ref };
}

// ---- leads ----

export async function updateLead(leadId: string, b: Record<string, unknown>) {
  const sql = await db();
  const status = clean(b.status, 20);
  if (status && !["new", "contacted", "engaged", "ready_to_buy", "paid", "lost"].includes(status)) throw new HttpError(400, "Unknown status.");
  const note = clean(b.note, 500);
  const [r] = await sql`update leads set status = coalesce(${status || null}, status), note = case when ${note} = '' then note else ${note} end,
      contacted_at = coalesce(contacted_at, case when ${status} not in ('', 'new') then now() end), updated_at = now() where id = ${leadId} returning id, status`;
  if (!r) throw new HttpError(404, "Lead not found.");
  return r;
}

// ---- what to do next ----

/** The short list a good sales lead would write each morning. Each line says what to do. */
export async function brief() {
  const sql = await db();
  const items: { priority: number; what: string; why: string; tool: string }[] = [];
  const add = (priority: number, what: string, why: string, tool: string) => items.push({ priority, what, why, tool });

  for (const f of (await fulfilmentFlags()).slice(0, 8)) {
    const t = f.kind === "no_po" ? "purchase_order (create), then send" : f.kind === "no_installer" ? "assign_installer" : "message the supplier (send_email is for customers and prospects; use whatsapp_link)";
    add(f.kind === "no_po" ? 1 : 2, f.text, "Paid orders wait on us", t);
  }
  const hot = await sql`select id, name, phone, email, total, status, updated_at from leads where order_id is null and consent and status in ('ready_to_buy', 'engaged') and updated_at < now() - interval '6 hours' order by total desc limit 5`;
  for (const l of hot) add(1, `${l.name || l.id} (${l.status.replace("_", " ")}, ${naira(l.total)}) has gone quiet`, "Closest to paying", "draft a reply (send_email kind=customer, or whatsapp_link)");
  const fresh = await sql`select count(*)::int as n from leads where order_id is null and status = 'new' and created_at < now() - interval '2 hours' and created_at > now() - interval '3 days'`;
  if (fresh[0].n) add(2, `${fresh[0].n} new leads haven't been contacted`, "Speed wins sales: reply within the hour", "list_leads status=new, then reply");
  const stuck = await sql`select count(*)::int as n from orders where status = 'pending' and status_at < now() - interval '24 hours'`;
  if (stuck[0].n) add(2, `${stuck[0].n} orders pending over 24h`, "Customers paid and haven't heard", "update_order status=confirmed after the PO is in");
  const pay = await payouts();
  if (pay.totals.approved > 0) add(3, `${naira(pay.totals.approved)} seller commission is ready to pay`, "Paying sellers on time keeps them selling", "Admin > Payouts (a person pays)");
  const due = await sql`select id, name, kind, status from prospects where follow_up_on <= current_date and not stop and status in ('new', 'contacted') order by follow_up_on limit 6`;
  for (const p of due) add(3, `${p.status === "new" ? "Write to" : "Follow up with"} ${p.name} (${p.kind})`, "Outreach follow-up is due", "send_email kind=outreach (needs approval)");
  const [pros] = await sql`select count(*)::int as n from prospects where status in ('new', 'contacted')`;
  if (pros.n < 5) add(4, "Fewer than 5 live prospects: find more distributors to talk to", "A pipeline needs names", "prospects (save), then outreach");
  const [week] = await sql`select count(*) filter (where created_at > now() - interval '7 days')::int as w, count(*) filter (where created_at <= now() - interval '7 days' and created_at > now() - interval '14 days')::int as p from leads`;
  if (week.p && week.w < week.p * 0.7) add(3, `Leads are down: ${week.w} this week vs ${week.p} last week`, "Top of the funnel is slowing", "site_traffic, then share the shop link or post offers");
  return items.sort((a, b) => a.priority - b.priority).slice(0, 15).map((x) => ({ ...x, link: `${SITE()}/admin` }));
}

export async function outboundLog(limit: number) {
  const sql = await db();
  return sql`select at, kind, recipient, subject, actor, ref, sent from outbound_log order by at desc limit ${limit}`;
}
