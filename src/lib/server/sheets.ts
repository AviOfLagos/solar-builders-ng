import "server-only";
import { createSign } from "node:crypto";
import { after } from "next/server";
import { db } from "./db";

/**
 * Optional Google Sheets mirror of orders (AviOfLagos/solar-ops-agent#38): one row per order, upserted by ref,
 * so the team can open a simple sheet anywhere. Ref, date, customer first name, state, total, status,
 * supplier, installer. No phone, email or address.
 *
 * Off unless SHEETS_ORDERS_ID, GOOGLE_SA_EMAIL and GOOGLE_SA_KEY are set (a service account with edit access to
 * the sheet; first tab named "Orders"). Never throws and gives up after 8 seconds, so it can't block an order.
 */
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TAB = "Orders";
const HEADER = ["Ref", "Date", "Customer", "State", "Total (₦)", "Status", "Supplier", "Installer", "Updated"];

let token: { value: string; exp: number } | null = null;

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

async function accessToken(email: string, key: string, signal: AbortSignal): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.exp - 60 > now) return token.value;
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const sig = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(key.replace(/\\n/g, "\n"));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claims}.${b64url(sig)}`,
    }),
    signal,
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: now + j.expires_in };
  return token.value;
}

/** The sheet row for an order: first name only, and nothing that reaches the customer. */
export async function orderSheetRow(ref: string): Promise<string[] | null> {
  const sql = await db();
  const [o] = await sql`
    select o.id, o.created_at, o.buyer->>'name' as name, coalesce(o.delivery->>'state', 'Lagos') as state,
           o.subtotal, o.status,
           (select string_agg(distinct s.name, ', ') from purchase_orders p join suppliers s on s.id = p.supplier_id
             where p.order_id = o.id) as supplier,
           (select i.name from order_jobs j join installers i on i.id = j.installer_id where j.order_id = o.id) as installer
    from orders o where o.id = ${ref}`;
  if (!o) return null;
  const first = String(o.name ?? "").trim().split(/\s+/)[0] ?? "";
  return [
    String(o.id),
    new Date(o.created_at as Date).toISOString().slice(0, 10),
    first,
    String(o.state),
    String(o.subtotal),
    String(o.status),
    String(o.supplier ?? ""),
    String(o.installer ?? ""),
    new Date().toISOString().slice(0, 16).replace("T", " "),
  ];
}

export async function mirrorOrder(ref: string): Promise<void> {
  const sheet = process.env.SHEETS_ORDERS_ID;
  const email = process.env.GOOGLE_SA_EMAIL;
  const key = process.env.GOOGLE_SA_KEY;
  if (!sheet || !email || !key) return;
  const signal = AbortSignal.timeout(8000);
  try {
    const row = await orderSheetRow(ref);
    if (!row) return;
    const auth = { authorization: `Bearer ${await accessToken(email, key, signal)}` };
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}/values`;
    const col = await fetch(`${base}/${TAB}!A:A`, { headers: auth, signal });
    if (!col.ok) throw new Error(`read ${col.status}`);
    const refs = (((await col.json()) as { values?: string[][] }).values ?? []).map((r) => r[0]);
    // RAW input: nothing a customer typed is ever evaluated as a formula.
    if (refs.length === 0) {
      await fetch(`${base}/${TAB}!A1:I1?valueInputOption=RAW`, {
        method: "PUT",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ values: [HEADER] }),
        signal,
      });
    }
    const at = refs.indexOf(ref);
    const r =
      at >= 0
        ? await fetch(`${base}/${TAB}!A${at + 1}:I${at + 1}?valueInputOption=RAW`, {
            method: "PUT",
            headers: { ...auth, "content-type": "application/json" },
            body: JSON.stringify({ values: [row] }),
            signal,
          })
        : await fetch(`${base}/${TAB}!A:I:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
            method: "POST",
            headers: { ...auth, "content-type": "application/json" },
            body: JSON.stringify({ values: [row] }),
            signal,
          });
    if (!r.ok) throw new Error(`write ${r.status}`);
  } catch (e) {
    console.error(`[sheets] order ${ref} not mirrored:`, (e as Error).message);
  }
}

/** Mirrors after the response (and after the order's transaction has committed). Safe outside a request too. */
export function mirrorOrderLater(ref: string) {
  try {
    after(() => mirrorOrder(ref));
  } catch {
    void mirrorOrder(ref);
  }
}
