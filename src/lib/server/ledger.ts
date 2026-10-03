import "server-only";
import { code, type Tx } from "./db";

/**
 * Append-only money record. Kinds:
 * payment (card money in) · refund (card money out) · gift_hold (gift balance reserved for an order) ·
 * gift_release (reservation returned) · gift_issued (new gift card value) · store_cover (a shortfall we absorbed).
 */
export type LedgerKind = "payment" | "refund" | "gift_hold" | "gift_release" | "gift_issued" | "store_cover";

export async function ledger(tx: Tx, kind: LedgerKind, amount: number, ref: string, piId: string | null = null, note = "") {
  if (!amount) return;
  await tx`insert into ledger ${tx({ kind, amount, ref, pi_id: piId, note: note.slice(0, 300) })}`;
}

/** A new order reference, unique even if two are made at once. */
export async function insertOrder(tx: Tx, row: Record<string, unknown>) {
  for (let i = 0; i < 5; i++) {
    const ref = "SB-" + code().toUpperCase().slice(0, 6);
    const [o] = await tx`insert into orders ${tx({ ...row, id: ref } as Record<string, unknown>)} on conflict (id) do nothing returning *`;
    if (o) return o as unknown as OrderRow;
  }
  throw new Error("Could not create an order reference");
}

export type OrderRow = {
  id: string; pi_id: string | null; user_id: string | null; store_id: string | null; pool_id: string | null;
  items: { id: string; name: string; qty: number; price: number }[];
  subtotal: number; gift_card_used: number; gift_code: string | null; total_paid: number; refunded: number; commission: number;
  buyer: { name: string; email: string; phone: string };
  delivery: { name: string; phone: string; altPhone: string; address: string; lga: string; landmark: string; notes: string; installer?: boolean };
  recipient: { name: string; phone: string; message: string } | null;
  installer: boolean; status: string; source: string; lead_id: string | null; created_at: Date; status_at: Date;
};
