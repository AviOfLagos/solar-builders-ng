import type { Metadata } from "next";
import { withOg } from "@/lib/meta";
export const metadata: Metadata = withOg({ title: "Solar gift cards — give light in Lagos", description: "Buy a Solar Builders gift card from ₦10,000 for birthdays, weddings, parents or staff. Spend it on any solar product or package in Lagos.", alternates: { canonical: "/gift-cards" } }, "page/gift-cards");
export default function L({ children }: { children: React.ReactNode }) { return children; }
