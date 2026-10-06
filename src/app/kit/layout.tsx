import type { Metadata } from "next";
import { withOg } from "@/lib/meta";

export const metadata: Metadata = withOg({ title: "Your solar kit: pay your way", description: "Pay in full, split it with friends on Go Solar Me, or pay small small.", alternates: { canonical: "/kit" } }, "page/kit");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
