import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { limitIp } from "@/lib/server/api";
import { googleSignIn } from "@/lib/server/google";
import { STORE } from "@/config/store";

/**
 * Google posts the signed-in user here (redirect mode). Works in WhatsApp and Instagram
 * in-app browsers, where pop-ups fail. The nonce cookie ties the token to this browser.
 */
export async function POST(req: Request) {
  const back = (path: string) => NextResponse.redirect(new URL(path, STORE.url), 303);
  const jar = await cookies();
  const nonce = jar.get("sb_gnonce")?.value;
  const nextRaw = jar.get("sb_next")?.value || "/account";
  const next = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "/account";
  jar.delete("sb_gnonce");
  jar.delete("sb_next");
  try {
    await limitIp(req, "google", 30, 900);
    const form = await req.formData().catch(() => null);
    const credential = String(form?.get("credential") ?? "").slice(0, 4096);
    if (!nonce || !credential) return back(`/account?error=google`);
    const r = await googleSignIn(credential, nonce);
    if ("error" in r) return back(`/account?error=${r.status === 409 ? "google_taken" : "google"}`);
    return back(next);
  } catch (e) {
    console.error("[google redirect]", e);
    return back(`/account?error=google`);
  }
}
