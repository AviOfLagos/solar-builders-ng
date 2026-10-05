import { CATEGORIES } from "./categories";
import { STORE } from "@/config/store";

export type NavLink = { href: string; label: string; sub?: string; icon?: string; tag?: string };
export type NavGroup = { title: string; links: NavLink[] };
export type NavItem = { label: string; href?: string; groups?: NavGroup[]; feature?: "kit" | "link" | "help" };

export const WHATSAPP = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent("Hi Solar Builders, I need help choosing a solar setup.")}`;

/** One menu for the header, the phone sheet and the footer. Everything is open to everyone. */
export const MENU: NavItem[] = [
  {
    label: "Shop",
    feature: "kit",
    groups: [
      {
        title: "Browse",
        links: [
          { href: "/packages", label: "Packages", sub: "Ready kits for how you live", icon: "grid" },
          { href: "/shop", label: "All products", sub: "Every item we stock", icon: "search" },
          { href: "/brands", label: "Brands", sub: "Felicity, itel, Sun King and more", icon: "shield" },
          { href: "/deals", label: "Solar Friday deals", sub: "Weekly discounts", icon: "bolt", tag: "Fridays" },
        ],
      },
      { title: "Categories", links: CATEGORIES.map((c) => ({ href: `/category/${c.slug}`, label: c.name })) },
    ],
  },
  {
    label: "Pay your way",
    feature: "link",
    groups: [
      {
        title: "Pay yourself",
        links: [
          { href: "/find", label: "Pay now", sub: "Card, transfer or USSD", icon: "card" },
          { href: "/pay-small-small", label: "Pay small small", sub: "Spread it over 3–12 months", icon: "calendar" },
          { href: "/give", label: "Buy for someone", sub: "Pay from anywhere, we deliver", icon: "gift" },
        ],
      },
      {
        title: "Pay together",
        links: [
          { href: "/go-solar-me", label: "Go Solar Me", sub: "A page anyone can chip in to", icon: "megaphone" },
          { href: "/fund/new?kind=squad", label: "Split with your squad", sub: "Equal shares, a button each", icon: "split" },
          { href: "/gift-cards", label: "Gift cards", sub: "They choose the kit", icon: "ticket" },
        ],
      },
    ],
  },
  { label: "For installers", href: "/sell" },
  {
    label: "Help",
    feature: "help",
    groups: [
      {
        title: "Learn",
        links: [
          { href: "/guides", label: "Guides", sub: "Sizing, batteries, installs", icon: "sparkle" },
          { href: "/guides/solar-installation-cost-lagos", label: "Installation costs", sub: "What it costs in Lagos", icon: "tools" },
          { href: "/faq", label: "Questions", sub: "Delivery, warranty, refunds", icon: "chat" },
        ],
      },
      {
        title: "Your orders",
        links: [
          { href: "/account", label: "Track an order", sub: "Delivery and install status", icon: "truck" },
          { href: "/open", label: "Open a link or code", sub: "From an installer or a friend", icon: "link" },
          { href: "/legal/refunds", label: "Refunds", sub: "How and when", icon: "shield" },
        ],
      },
    ],
  },
];
