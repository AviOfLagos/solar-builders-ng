import type { Metadata } from "next";
import { withOg } from "@/lib/meta";

export const metadata: Metadata = withOg({ title: "Find my solar kit in 4 taps", description: "Tell us what you power. We match a kit from genuine brands and show what you save on fuel.", alternates: { canonical: "/find" } }, "page/find");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
