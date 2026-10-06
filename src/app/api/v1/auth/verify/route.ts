import { ok, route, requireUser, limit } from "@/lib/server/api";
import { sendVerification } from "@/lib/server/emails";

/** "Send me the confirm link again." */
export const POST = route(async () => {
  const s = await requireUser();
  if (s instanceof Response) return s;
  await limit(`verify:${s.uid}`, 3, 3600);
  const r = await sendVerification(s.uid);
  return ok({ sent: r.sent, already: !!r.already });
});
