import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { customAlphabet } from "nanoid";

/**
 * Paystack: Nigerian cards, bank transfer and USSD, in naira. We use its hosted page (a redirect),
 * which works in every browser including WhatsApp's, and confirm every payment server-side.
 */
export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY;

/** Our references for Paystack payments start with ps_ so we always know which provider to ask. */
export const newPaystackRef = () => "ps_" + customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20)();
export const isPaystackRef = (ref: string) => /^ps_[a-z0-9]{20}$/.test(ref);

export type PaystackAuthorization = {
  authorization_code: string; reusable: boolean; last4: string; exp_month: string; exp_year: string;
  card_type: string; brand: string; bank: string; signature: string; channel: string;
};
export type PaystackTx = {
  id: number; reference: string; status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  amount: number; currency: string; channel: string; metadata: Record<string, unknown> | string | null;
  customer: { email: string }; authorization?: PaystackAuthorization; gateway_response?: string;
  /** charge_authorization only: the bank wants the buyer to approve this charge on Paystack's page. */
  paused?: boolean; authorization_url?: string;
};

async function ps<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const res = await fetch(`${process.env.PAYSTACK_API_BASE || "https://api.paystack.co"}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status) throw Object.assign(new Error(json.message || `Paystack error ${res.status}`), { paystack: true, httpStatus: res.status });
  return json.data as T;
}

/** Metadata values we send are all strings; Paystack may hand them back as an object or a JSON string. */
export function paystackMeta(tx: PaystackTx): Record<string, string> {
  let m = tx.metadata;
  if (typeof m === "string") { try { m = JSON.parse(m); } catch { m = {}; } }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries((m as Record<string, unknown>) || {})) if (typeof v === "string" || typeof v === "number") out[k] = String(v);
  return out;
}

export type PaystackChannel = "card" | "bank_transfer" | "ussd" | "bank";

export async function initializePaystack(o: { email: string; amountNgn: number; reference: string; callbackUrl: string; metadata: Record<string, string>; channels?: PaystackChannel[] }) {
  return ps<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    body: {
      email: o.email, amount: o.amountNgn * 100, currency: "NGN", reference: o.reference, callback_url: o.callbackUrl,
      metadata: o.metadata, channels: o.channels ?? ["card", "bank_transfer", "ussd", "bank"],
    },
  });
}

export const verifyPaystack = (reference: string) => ps<PaystackTx>(`/transaction/verify/${encodeURIComponent(reference)}`);

export async function chargePaystackAuthorization(o: { authorizationCode: string; email: string; amountNgn: number; reference: string; metadata: Record<string, string> }) {
  return ps<PaystackTx>("/transaction/charge_authorization", {
    body: { authorization_code: o.authorizationCode, email: o.email, amount: o.amountNgn * 100, currency: "NGN", reference: o.reference, metadata: o.metadata },
  });
}

export async function refundPaystack(reference: string, amountNgn?: number, note = "") {
  return ps<{ id: number; status: string }>("/refund", {
    body: { transaction: reference, ...(amountNgn ? { amount: amountNgn * 100 } : {}), currency: "NGN", merchant_note: note.slice(0, 200) },
  });
}

/** Paystack signs webhook bodies with HMAC-SHA512 of the secret key. */
export function paystackSignatureOk(raw: string, signature: string | null) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const want = createHmac("sha512", key).update(raw).digest("hex");
  return want.length === signature.length && timingSafeEqual(Buffer.from(want), Buffer.from(signature));
}
