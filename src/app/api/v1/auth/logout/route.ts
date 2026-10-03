import { clearSession } from "@/lib/server/session";
import { ok } from "@/lib/server/api";
export async function POST() {
  await clearSession();
  return ok({ ok: true });
}
