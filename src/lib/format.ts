const ngn = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const naira = (n: number) => ngn.format(n).replace("NGN", "₦").replace(/\s/g, "");

/** Nigerian mobile: 0803…, +234803…, 234803… (070, 080, 081, 090, 091 ranges). */
export const NG_PHONE = /^(?:\+?234|0)[789][01]\d{8}$/;
/** Any international number in E.164-ish form. */
export const INTL_PHONE = /^\+?[1-9]\d{6,14}$/;

/** Removes spaces, dashes, dots and brackets people type in phone numbers. */
export const normalizePhone = (s: string) => String(s ?? "").replace(/[\s().-]/g, "");

/** +2348031234567 for any Nigerian mobile format; other input is returned normalized. */
export function ngE164(s: string) {
  const p = normalizePhone(s);
  if (!NG_PHONE.test(p)) return p;
  return "+234" + p.replace(/^(?:\+?234|0)/, "");
}

/** 0803 123 4567 */
export function ngLocal(s: string) {
  const p = ngE164(s);
  if (!p.startsWith("+234")) return p;
  const d = "0" + p.slice(4);
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

export const isEmail = (s: string) => s.length <= 120 && /^[^\s@]{1,64}@[^\s@.]+(?:\.[^\s@.]+)*\.[a-z]{2,}$/i.test(s);

/** At least two letters, in any script. Blocks "..", "12" and the like. */
export const isName = (s: string) => /\p{L}.*\p{L}/u.test(s);

export const firstName = (n: unknown) => String(n ?? "").trim().split(/\s+/)[0] || "";
