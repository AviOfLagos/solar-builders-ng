import "server-only";
import { createHash } from "node:crypto";

/** Returns a message if the password is too weak or has appeared in a known breach, else "". */
export async function passwordProblem(pw: string, email = ""): Promise<string> {
  if (pw.length < 8 || pw.length > 128) return "Use 8 to 128 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use at least one letter and one number.";
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && pw.toLowerCase().includes(local)) return "Don't use your email in your password.";
  if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwerty|abcd1234)/i.test(pw)) return "That password is too easy to guess.";
  // Have I Been Pwned range check: only the first 5 characters of the SHA-1 leave our server. Fails open if unreachable.
  try {
    const h = createHash("sha1").update(pw).digest("hex").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { headers: { "Add-Padding": "true" }, signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const hit = (await res.text()).split("\n").find((l) => l.startsWith(h.slice(5)));
      if (hit && Number(hit.split(":")[1]) > 0) return "That password has appeared in a data breach. Choose a different one.";
    }
  } catch {}
  return "";
}
