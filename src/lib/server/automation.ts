import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./api";

/** n8n calls us back signed the same way we sign it: header x-sb-signature = hex HMAC-SHA256 of the raw body, key WEBHOOK_SECRET. */
export function verifyAutomation(req: Request, raw: string) {
  const key = process.env.WEBHOOK_SECRET;
  const sig = req.headers.get("x-sb-signature") || "";
  if (!key || !sig) return false;
  const want = createHmac("sha256", key).update(raw).digest();
  const got = Buffer.from(sig, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function signedJson(req: Request) {
  const raw = await req.text();
  if (!verifyAutomation(req, raw)) throw new HttpError(403, "Bad signature.");
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { throw new HttpError(400, "Bad JSON."); }
}
