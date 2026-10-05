import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

/** Read-only queries against the store's database. */
export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set for the agent.");
    client = postgres(url, { max: 3, idle_timeout: 20, prepare: false });
  }
  return client;
}

export const PAID = ["pending", "confirmed", "out_for_delivery", "delivered", "installed"];
export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
