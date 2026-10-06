import { ok, route, str, HttpError } from "@/lib/server/api";
import { ngE164, NG_PHONE, normalizePhone } from "@/lib/format";
import { signedJson } from "@/lib/server/automation";
import { stopByPhone } from "@/lib/server/agent-ops";

/** Customer replied STOP on WhatsApp. n8n posts { phone } signed with WEBHOOK_SECRET; we end every open lead for that number. */
export const POST = route(async (req: Request) => {
  const b = await signedJson(req);
  const n = normalizePhone(str(b.phone, 24));
  if (!NG_PHONE.test(n)) throw new HttpError(400, "Bad phone.");
  return ok(await stopByPhone(ngE164(n)));
});
