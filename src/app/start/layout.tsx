import type { Metadata } from "next";
import { withOg } from "@/lib/meta";

export const metadata: Metadata = withOg({ title: "Start here: going solar made simple", description: "Pick your path: for you, for family in Lagos, with friends, or as an installer.", alternates: { canonical: "/start" } }, "page/start");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
