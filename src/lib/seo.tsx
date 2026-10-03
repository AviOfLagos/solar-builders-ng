import { STORE } from "@/config/store";
import { brandName, type Product } from "./catalog";

export const abs = (path: string) => new URL(path, STORE.url).toString();

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": abs("/#store"),
    name: STORE.name,
    url: STORE.url,
    logo: abs("/icon.svg"),
    image: abs("/opengraph-image"),
    telephone: STORE.supportPhone,
    ...(STORE.supportEmail ? { email: STORE.supportEmail } : {}),
    priceRange: "₦₦",
    currenciesAccepted: "NGN",
    paymentAccepted: "Credit card, Debit card",
    address: { "@type": "PostalAddress", addressLocality: "Lagos", addressRegion: "Lagos", addressCountry: "NG" },
    areaServed: { "@type": "State", name: "Lagos State, Nigeria" },
    sameAs: [],
  };
}

export function productJsonLd(p: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: abs(p.image),
    description: p.description || p.name,
    sku: p.id,
    category: p.category,
    brand: { "@type": "Brand", name: brandName(p.brand) },
    offers: {
      "@type": "Offer",
      url: abs(`/product/${p.slug}`),
      priceCurrency: "NGN",
      price: p.price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": abs("/#store") },
      areaServed: "Lagos, Nigeria",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: STORE.deliveryFee, currency: "NGN" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "NG", addressRegion: "LA" },
      },
    },
  };
}

export function breadcrumbs(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

export function faqJsonLd(qa: { q: string; a: string }[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) };
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
