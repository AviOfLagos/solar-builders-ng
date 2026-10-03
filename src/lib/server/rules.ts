import "server-only";
import { getProductById, type Product } from "@/lib/catalog";
import { CART, LAGOS_LGAS, STORE } from "@/config/store";
import { NG_PHONE, INTL_PHONE, normalizePhone, ngE164, isEmail, isName, naira } from "@/lib/format";
import { str, bool, HttpError } from "./api";

export type CartLine = { id: string; qty: number };
export type Line = { p: Product; qty: number };

/**
 * Prices a cart from our catalog. The client's prices are never used. Unknown products and
 * quantities under 1 are dropped, duplicate lines are merged, and quantities are capped.
 */
export function priceCart(items: unknown) {
  const merged = new Map<string, number>();
  for (const l of Array.isArray(items) ? items.slice(0, 200) : []) {
    if (!l || typeof l !== "object") continue;
    const pid = str((l as CartLine).id, 60);
    const qty = Math.trunc(Number((l as CartLine).qty));
    if (!pid || !Number.isFinite(qty) || qty < 1 || !getProductById(pid)) continue;
    merged.set(pid, Math.min(CART.maxQty, (merged.get(pid) ?? 0) + qty));
  }
  const lines: Line[] = [...merged].slice(0, CART.maxLines).map(([pid, qty]) => ({ p: getProductById(pid)!, qty }));
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const delivery = lines.length ? STORE.deliveryFee : 0;
  return { lines, subtotal, delivery, total: subtotal + delivery };
}
export type PricedCart = ReturnType<typeof priceCart>;

/** Throws a 400 when a cart can't be paid for online. */
export function checkCart(cart: PricedCart, empty = "Your cart is empty.") {
  if (!cart.lines.length) throw new HttpError(400, empty);
  if (cart.total > CART.maxTotal) throw new HttpError(400, `Orders above ${naira(CART.maxTotal)} are arranged on WhatsApp. Message us and we'll help.`);
}

export const compactItems = (lines: Line[]) => lines.map((l) => ({ id: l.p.id, qty: l.qty, name: l.p.name, price: l.p.price }));
export const storedItems = (lines: Line[]) => lines.map((l) => ({ id: l.p.id, qty: l.qty }));

export type DeliveryInput = {
  name: string; email: string; phone: string; altPhone?: string;
  address: string; lga: string; landmark?: string; notes?: string; installer?: boolean;
  forSomeoneElse?: boolean; recipientName?: string; recipientPhone?: string; giftMessage?: string;
};

/**
 * Buyer and delivery details. When buying for someone else, the address and the number we call
 * are the recipient's, and the buyer's own phone may be foreign or left out.
 */
export function validateDelivery(i: Partial<Record<keyof DeliveryInput, unknown>>, opts: { addressOptional?: boolean } = {}) {
  const errors: Record<string, string> = {};
  const v = {
    name: str(i.name, 80),
    email: str(i.email, 120).toLowerCase(),
    phone: normalizePhone(str(i.phone, 24)),
    altPhone: normalizePhone(str(i.altPhone, 24)),
    address: str(i.address, 300),
    lga: str(i.lga, 40),
    landmark: str(i.landmark, 120),
    notes: str(i.notes, 300),
    installer: bool(i.installer),
    forSomeoneElse: bool(i.forSomeoneElse),
    recipientName: str(i.recipientName, 80),
    recipientPhone: normalizePhone(str(i.recipientPhone, 24)),
    giftMessage: str(i.giftMessage, 300),
  };
  if (!isName(v.name)) errors.name = "Enter your full name.";
  if (!isEmail(v.email)) errors.email = "Enter a valid email address.";
  if (v.forSomeoneElse) {
    if (v.phone && !NG_PHONE.test(v.phone) && !INTL_PHONE.test(v.phone)) errors.phone = "Enter a valid phone number with country code, or leave it empty.";
    if (!isName(v.recipientName)) errors.recipientName = "Enter the name of the person receiving it.";
    if (!NG_PHONE.test(v.recipientPhone)) errors.recipientPhone = "Enter their Nigerian mobile number. We call them to arrange delivery.";
  } else if (!NG_PHONE.test(v.phone)) errors.phone = "Enter a Nigerian mobile number, e.g. 0803 123 4567.";
  if (v.altPhone && !NG_PHONE.test(v.altPhone)) errors.altPhone = "Enter a valid Nigerian number or leave it empty.";
  if (!(opts.addressOptional && !v.address) && v.address.replace(/\s/g, "").length < 8) errors.address = "Enter the full delivery address.";
  if (!(LAGOS_LGAS as readonly string[]).includes(v.lga)) errors.lga = "We deliver within Lagos only. Pick the LGA.";
  // Store numbers in one format so leads, orders and WhatsApp links match.
  v.phone = NG_PHONE.test(v.phone) ? ngE164(v.phone) : v.phone;
  v.altPhone = v.altPhone ? ngE164(v.altPhone) : "";
  v.recipientPhone = v.recipientPhone ? ngE164(v.recipientPhone) : "";
  return { values: v, errors };
}
export type Delivery = ReturnType<typeof validateDelivery>["values"];

/** Where the kit goes and who we call. */
export const deliveryJson = (v: Delivery) => ({
  name: v.forSomeoneElse ? v.recipientName : v.name,
  phone: v.forSomeoneElse ? v.recipientPhone : v.phone,
  altPhone: v.altPhone, address: v.address, lga: v.lga, landmark: v.landmark, notes: v.notes, installer: v.installer,
});

export function assertValid(errors: Record<string, string>, message = "Check the highlighted fields.") {
  if (Object.keys(errors).length) throw new HttpError(400, message, { fields: errors });
}
