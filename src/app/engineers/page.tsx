import type { Metadata } from "next";
import { Survey } from "./Survey";

export const metadata: Metadata = {
  title: "Join our installer network",
  description: "Solar installers in Lagos: a short interview to join the Solar Builders NG installer network. Type or record your answers.",
  alternates: { canonical: "/engineers" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Survey />;
}
