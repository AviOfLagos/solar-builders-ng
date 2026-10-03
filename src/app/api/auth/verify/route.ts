import { NextResponse } from "next/server";
import { verifyOtp, createSession } from "@/lib/server/session";
import { findOrCreateCustomer, stripeConfigured } from "@/lib/server/stripe";

export async function POST(req: Request) {
  const { email, code, name } = await req.json().catch(() => ({}));
  const e = String(email || "").trim().toLowerCase();
  const r = await verifyOtp(e, String(code || ""));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  const c = await findOrCreateCustomer(e, name ? String(name).slice(0, 80) : undefined);
  await createSession({ email: e, customerId: c.id, name: c.name || undefined });
  return NextResponse.json({ ok: true });
}
