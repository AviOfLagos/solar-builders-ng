import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromoBar } from "@/components/PromoBar";
import { CartDrawer } from "@/components/CartDrawer";
import { STORE } from "@/config/store";
import { JsonLd, orgJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(STORE.url),
  title: { default: "Solar Builders NG — Solar inverters, lithium batteries & panels in Lagos", template: "%s | Solar Builders NG" },
  description: "Buy genuine Felicity, itel, Sun King, Arnergy and EcoFlow solar inverters, lithium batteries, panels and power stations in Lagos. Free Lagos delivery and optional installation.",
  keywords: ["solar inverter Lagos", "lithium battery price Nigeria", "solar panels Lagos", "5kVA inverter price", "EcoFlow Nigeria", "Felicity solar Lagos", "solar installation Lagos"],
  openGraph: { type: "website", siteName: STORE.name, locale: "en_NG" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#10213B" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className="antialiased">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-sun focus:p-3">Skip to content</a>
        <PromoBar />
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <JsonLd data={orgJsonLd()} />
      </body>
    </html>
  );
}
