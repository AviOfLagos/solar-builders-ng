import { CART, POOL, STORE } from "@/config/store";
import { naira } from "@/lib/format";

export type LegalDoc = { slug: string; title: string; summary: string; updated: string; sections: { h: string; p: string[] }[] };

const contact = `WhatsApp ${STORE.supportPhone}`;

export const LEGAL: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms of sale",
    summary: "How buying from Solar Builders NG works: prices, payment, delivery in Lagos and installation.",
    updated: "2026-10-03",
    sections: [
      { h: "Who we are", p: [`${STORE.name} sells solar products from the brands listed on this site and delivers them within Lagos State, Nigeria. You can reach us on ${contact}.`] },
      { h: "Prices", p: ["Prices are in naira and include our margin on the brand's official price. The price you see at checkout is the price you pay; we never charge more than the total shown before you tap Pay.", "Solar Friday shows a discount against a higher reference price. What you pay on a Friday is the same as our normal price."] },
      { h: "Payment", p: ["Naira payments (card, bank transfer, USSD) are processed by Paystack. Cards from outside Nigeria are processed by Stripe. We never see or store your full card number: saved cards are kept as a token from Paystack or Stripe, and you can remove them at any time in your account.", `Orders above ${naira(CART.maxTotal)} are arranged on WhatsApp.`] },
      { h: "Your order", p: ["After payment your order is pending until we call to confirm stock and delivery. If we can't fulfil an order, we refund it in full to the card or gift card it came from."] },
      { h: "Delivery", p: ["We deliver within Lagos State only. Delivery is free unless the checkout says otherwise. We call the number given for the delivery before we come."] },
      { h: "Installation", p: ["Ticking “I need an installer” is a request, not a charge. We connect you with an engineer who quotes the installation separately. Installation is agreed between you and the installer."] },
      { h: "Warranty", p: ["Products carry the brand's own warranty. We help you make a warranty claim with the brand."] },
      { h: "Referral links", p: ["Sellers and installers who refer you earn a small commission from us. It does not change your price."] },
    ],
  },
  {
    slug: "refunds",
    title: "Refunds and returns",
    summary: "When money comes back, and where it goes.",
    updated: "2026-10-03",
    sections: [
      { h: "Where refunds go", p: ["Money always goes back the way it came: card payments to the same card, gift card value back to the same gift card. We never refund to a different person or account, and we never pay out cash."] },
      { h: "Before delivery", p: ["You can cancel an order before it leaves our warehouse for a full refund. Message us on WhatsApp with your order number."] },
      { h: "After delivery", p: ["If a product arrives damaged or not as described, tell us within 7 days and we arrange a replacement or refund. Products must be returned with their packaging. Faults after that are handled under the brand's warranty."] },
      { h: "How long it takes", p: ["We start refunds within 2 working days. Card refunds usually show in 5 to 10 working days, depending on your bank."] },
    ],
  },
  {
    slug: "pool-rules",
    title: "Go Solar Me rules",
    summary: "How group funding works and how supporters' money is protected.",
    updated: "2026-10-03",
    sections: [
      { h: "What a Go Solar Me page is", p: ["A page for one solar kit. People chip in towards that kit, or split it in fixed shares. It is a group purchase of a named kit, not a donation to a person."] },
      { h: "Where the money goes", p: [`Every payment goes to ${STORE.name}, never to the page owner. It can only become the kit on the page, a smaller kit chosen by the owner, or a refund. It is never paid out as cash.`] },
      { h: "When the goal is reached", p: ["The order places itself. We call the delivery contact, deliver in Lagos and arrange installation if it was requested."] },
      { h: "If a payment lands after the goal", p: ["Only what the goal still needs is kept. Anything above that goes straight back to the supporter's card. If what's left after a payment is under ₦1,000, we cover it ourselves."] },
      { h: "If the goal isn't reached", p: [`When the deadline passes, the owner can extend it once by ${POOL.extendDays} days, switch to a smaller kit the money already covers (anything left over becomes a gift card in the owner's name), or close the page. Supporters can still chip in meanwhile.`, `If the owner doesn't choose within ${POOL.choiceDays} days, the page closes and every supporter is refunded to their card automatically.`] },
      { h: "Privacy on the page", p: ["The public page shows the owner's first name, the LGA, the kit and the names supporters chose to show. Addresses and phone numbers are never shown."] },
      { h: "Misuse", p: ["We may close a page and refund supporters if it is misleading or breaks the law."] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    summary: "What we collect, why, and how to ask us to delete it. Written for the Nigeria Data Protection Act 2023.",
    updated: "2026-10-06",
    sections: [
      { h: "What we collect", p: ["Your name, email and phone; delivery addresses; what's in your cart; your orders; and for Go Solar Me, what you chipped in and your message. Card details are held by Paystack or Stripe, not by us."] },
      { h: "Why", p: ["To deliver your order, call you about it, run Go Solar Me pages and prevent fraud. If you give us your number and don't finish an order, we may message you once or twice about it. Reply STOP and we won't again."] },
      { h: "Who sees it", p: ["Our team, the installer you asked for, and the services that run the site: Paystack and Stripe (payments), Vercel (hosting), Neon (database) and Resend (email). We don't sell your data."] },
      { h: "Visit counts", p: ["We count page views and button clicks to see which pages help people. We use no cookies for this and store no name, email, phone or IP address with it: only the page, the button's label and a random id that lasts while your tab is open. These counts are deleted after 180 days."] },
      { h: "How long we keep it", p: ["Order records are kept as long as the law requires for accounting. Unfinished carts are deleted after 90 days."] },
      { h: "Your rights", p: [`You can ask for a copy of your data, to correct it or to delete it. Message us on ${contact}.`] },
    ],
  },
];

export const getLegal = (slug: string) => LEGAL.find((d) => d.slug === slug);
