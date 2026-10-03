import { NextResponse } from "next/server";
import { addContact } from "@/lib/server/brevo";
import { isEmail } from "@/lib/format";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const e = String(email || "").trim().toLowerCase();
  if (!isEmail(e)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const r = await addContact(e);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Couldn't subscribe right now. Try again." }, { status: 502 });
}
