import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromoBar } from "@/components/PromoBar";
import { LaunchNotice } from "@/components/LaunchNotice";
import { CartDrawer, LeadSync } from "@/components/CartDrawer";
import { STORE } from "@/config/store";
import { JsonLd, orgJsonLd } from "@/lib/seo";
import { RefCapture } from "@/components/RefCapture";
import { Suspense } from "react";
import { FocusGate } from "@/components/FocusGate";
import { Helper } from "@/components/Helper";
import { JourneyHydrator } from "@/lib/journey";
import { Tracker } from "@/components/Tracker";

export const metadata: Metadata = {
  metadataBase: new URL(STORE.url),
  title: { default: "Solar Builders NG — Solar inverters, lithium batteries & panels in Lagos", template: "%s | Solar Builders NG" },
  description: "Buy genuine Felicity, itel, Sun King, Arnergy and EcoFlow solar inverters, lithium batteries, panels and power stations in Lagos. Free Lagos delivery and optional installation.",
  keywords: ["solar inverter Lagos", "lithium battery price Nigeria", "solar panels Lagos", "5kVA inverter price", "EcoFlow Nigeria", "Felicity solar Lagos", "solar installation Lagos"],
  openGraph: { type: "website", siteName: STORE.name, locale: "en_NG", images: [{ url: "/og/page/home", width: 1200, height: 630, alt: STORE.name }] },
  twitter: { card: "summary_large_image", images: ["/og/page/home"] },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#F3F2EC" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className="antialiased">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-sun focus:p-3">Skip to content</a>
        <FocusGate><PromoBar /><LaunchNotice /></FocusGate>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <FocusGate><Footer /><Helper /></FocusGate>
        <CartDrawer />
        <LeadSync />
        <JourneyHydrator />
        <Tracker />
        <Suspense><RefCapture /></Suspense>
        <JsonLd data={orgJsonLd()} />
      </body>
    </html>
  );
}
