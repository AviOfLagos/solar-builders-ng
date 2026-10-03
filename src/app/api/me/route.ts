import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { listCards, stripeConfigured } from "@/lib/server/stripe";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null, cards: [] });
  const cards = stripeConfigured() ? await listCards(s.customerId).catch(() => []) : [];
  return NextResponse.json({ user: { email: s.email, name: s.name }, cards });
}
