import Link from "next/link";
import { STORE } from "@/config/store";
import { brands, products } from "@/lib/catalog";
import { naira } from "@/lib/format";

/** What prices are built from today. Editing from here is issue #8. */
export default function Pricing() {
  const pct = (n: number) => `${+(n * 100).toFixed(2)}%`;
  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-4xl">Pricing</h1><p className="text-sm text-mute">Every price is the brand&apos;s official price plus our markup, rounded to ₦{STORE.roundTo}.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-night p-5 text-white"><p className="text-sm text-white/60">Default markup</p><p className="num mt-2 text-4xl font-light text-mint">{pct(STORE.markup)}</p></div>
        <div className="rounded-3xl bg-paper p-5"><p className="text-sm text-ink-2">Products priced</p><p className="num mt-2 text-4xl font-light">{products.length}</p></div>
        <div className="rounded-3xl bg-paper p-5"><p className="text-sm text-ink-2">Brand overrides</p><p className="num mt-2 text-4xl font-light">{Object.keys(STORE.brandMarkup).length}</p></div>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-paper">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="px-5 py-3 font-semibold">Brand</th><th className="py-3 font-semibold">Markup</th><th className="py-3 font-semibold">Products</th><th className="px-5 py-3 text-right font-semibold">Price range</th></tr></thead>
          <tbody>
            {brands.map((b) => {
              const ps = products.filter((p) => p.brand === b.slug);
              return (
                <tr key={b.slug} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3 font-semibold">{b.name}</td>
                  <td className="py-3">{pct(STORE.brandMarkup[b.slug] ?? STORE.markup)}</td>
                  <td className="py-3">{ps.length}</td>
                  <td className="num px-5 py-3 text-right">{naira(Math.min(...ps.map((p) => p.price)))} – {naira(Math.max(...ps.map((p) => p.price)))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="rounded-2xl bg-lemon-tint p-4 text-sm">Editing markups, fixed prices and supplier costs from here is next: <Link className="font-semibold underline" href="https://github.com/AviOfLagos/solar-builders-ng/issues/8">issue #8</Link>. Today it&apos;s set in <code>src/config/pricing.json</code>.</p>
    </div>
  );
}
