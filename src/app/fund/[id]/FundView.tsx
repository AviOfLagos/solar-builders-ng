"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Two tabs on a phone (About, Supporters), side by side on a wide screen. Refreshes the numbers while the page is open. */
export function FundView({ about, supporters, count, live }: { about: React.ReactNode; supporters: React.ReactNode; count: number; live: boolean }) {
  const [tab, setTab] = useState<"about" | "supporters">("about");
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 20000);
    return () => clearInterval(t);
  }, [live, router]);
  const cls = (on: boolean) => `flex-1 rounded-xl py-2.5 text-sm font-semibold ${on ? "bg-night text-white" : "text-ink-2"}`;
  return (
    <div className="min-w-0">
      <div className="mb-6 flex gap-1 rounded-2xl bg-haze p-1 lg:hidden" role="tablist">
        <button role="tab" aria-selected={tab === "about"} className={cls(tab === "about")} onClick={() => setTab("about")}>About</button>
        <button role="tab" aria-selected={tab === "supporters"} className={cls(tab === "supporters")} onClick={() => setTab("supporters")}>Supporters{count ? ` (${count})` : ""}</button>
      </div>
      <div className={tab === "about" ? "" : "hidden lg:block"}>{about}</div>
      <div className={tab === "supporters" ? "" : "hidden lg:block"}>{supporters}</div>
    </div>
  );
}

/** A wide floating button on phones that jumps to the chip-in form. */
export function ChipInBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-paper via-paper/95 to-transparent px-4 pb-4 pt-6 lg:hidden">
      <a href="#chip-in" className="btn btn-sun w-full !py-4 text-base shadow-lg">Chip in</a>
    </div>
  );
}
