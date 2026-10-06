import type { Metadata } from "next";
import { AppSignIn } from "./AppSignIn";

export const metadata: Metadata = { title: "Sign in to the app", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string; go?: string }> }) {
  const q = await searchParams;
  return <AppSignIn state={String(q.state ?? "").slice(0, 100)} go={q.go === "1"} />;
}
