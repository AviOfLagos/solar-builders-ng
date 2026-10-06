import { requireTeam } from "@/lib/server/api";
import { orderUpdateEmail, resetEmail, verifyEmail } from "@/lib/server/emails";

/** See an email as customers do: /api/v1/admin/email-preview?t=verify|reset|confirmed|out_for_delivery|delivered|installed (team only). */
export async function GET(req: Request) {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const t = new URL(req.url).searchParams.get("t") ?? "verify";
  const m = t === "verify" ? verifyEmail("Ada Obi", "https://solar.nexprove.com/verify?token=preview") : t === "reset" ? resetEmail("Ada Obi", "482913") : orderUpdateEmail("Ada Obi", "SB-4F2K", t);
  return new Response(m?.html ?? "Unknown template", { headers: { "content-type": "text/html; charset=utf-8" } });
}
