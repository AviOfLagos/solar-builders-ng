import type { Metadata } from "next";
import { withOg } from "@/lib/meta";

export const metadata: Metadata = withOg({ title: "Start a Go Solar Me page", description: "Let family and friends chip in for your solar kit. If the goal isn't reached, everyone is refunded.", robots: { index: false } }, "page/go-solar-me");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
