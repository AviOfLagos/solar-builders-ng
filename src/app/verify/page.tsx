import type { Metadata } from "next";
import Link from "next/link";
import { confirmEmail } from "@/lib/server/emails";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = String((await searchParams).token ?? "").slice(0, 100);
  let msg = "";
  try { await confirmEmail(token); } catch (e) { msg = (e as Error).message; }
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-4xl">{msg ? "That didn't work" : "Email confirmed"}</h1>
      <p className="text-ink-2">{msg || "You're all set. Thanks for confirming."}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/account" className="btn btn-ink">Go to my account</Link>
        <a href="gosolarme://" className="btn btn-ghost">Open the app</a>
      </div>
    </main>
  );
}
