import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
export const metadata: Metadata = withOg({ title: "Sell solar & earn — for installers and resellers in Lagos", description: "Open a free solar store, put setups together for your clients and earn on every sale. We handle stock, payment and delivery across Lagos.", alternates: { canonical: "/sell" } }, "page/sell");
export default function L({ children }: { children: React.ReactNode }) { return children; }
