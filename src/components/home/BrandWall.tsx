import Link from "next/link";
import Image from "next/image";
import { brands, products } from "@/lib/catalog";
import { Icon } from "@/components/ui/Icon";
import { BrandRequest } from "./BrandRequest";

const LOGO: Record<string, { src: string; w: number; h: number }> = {
  felicity: { src: "/brands/felicity-logo.png", w: 540, h: 144 },
  itel: { src: "/brands/itel-logo.png", w: 528, h: 127 },
  "sun-king": { src: "/brands/sun-king-logo.svg", w: 679, h: 152 },
  arnergy: { src: "/brands/arnergy-logo.png", w: 518, h: 150 },
  ecoflow: { src: "/brands/ecoflow-logo.svg", w: 464, h: 48 },
};

/** The brands we stock as a logo wall, plus an open slot for brands that want in. */
export function BrandWall() {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
      {brands.map((b) => {
        const l = LOGO[b.slug];
        const count = products.filter((p) => p.brand === b.slug).length;
        return (
          <li key={b.slug}>
            <Link href={`/brands/${b.slug}`} className="group relative flex h-36 flex-col rounded-3xl bg-paper p-5 transition-shadow hover:shadow-[0_12px_32px_rgba(23,32,27,0.09)] sm:h-44">
              <span className="flex flex-1 items-center justify-center">
                {l ? (
                  <Image src={l.src} alt={b.name} width={l.w} height={l.h} className="h-auto max-h-11 w-auto max-w-[72%] opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 sm:max-h-12" />
                ) : <span className="text-xl font-semibold">{b.name}</span>}
              </span>
              <span className="flex items-center justify-between text-xs text-mute">
                <span>{count} products</span>
                <Icon name="arrow" size={16} className="-translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
            </Link>
          </li>
        );
      })}
      <li><BrandRequest /></li>
    </ul>
  );
}
