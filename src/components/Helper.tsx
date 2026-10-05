"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./ui/Icon";
import { OpenLinkForm } from "./OpenLink";
import { useJourney, type Role } from "@/lib/journey";
import { STORE } from "@/config/store";

type Tip = { key: string; role?: Role; icon: string; title: string; text: string; cta: string; href?: string; link?: boolean };

const TIPS: Tip[] = [
  { key: "find", role: "home", icon: "sun", title: "Not sure what size to get?", text: "Answer 3 quick questions and we'll match a kit, with what you'll save on fuel.", cta: "Find my kit", href: "/find" },
  { key: "gift", role: "gift", icon: "gift", title: "Buying for family in Lagos?", text: "Pay from anywhere. We deliver, install, and keep you posted.", cta: "Find a kit for them", href: "/find?who=someone" },
  { key: "group", role: "group", icon: "people", title: "Too much to pay at once?", text: "Let friends chip in, split it with your squad, or pay small small.", cta: "Go solar together", href: "/go-solar-me" },
  { key: "pro", role: "pro", icon: "tools", title: "Do you install solar?", text: "Send clients a priced equipment list in minutes, and earn on every sale.", cta: "For installers", href: "/sell" },
  { key: "link", icon: "link", title: "Got a link or code?", text: "Open a list from your installer or a friend's Go Solar Me page.", cta: "Open it", link: true },
  { key: "chat", icon: "whatsapp", title: "Rather talk to someone?", text: "A real person replies on WhatsApp with a kit and a full price.", cta: "Chat on WhatsApp", href: `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent("Hi, I need help choosing a solar kit")}` },
];

const WEEK = 7 * 24 * 3600 * 1000;
const HIDE_ON = ["/account", "/admin", "/team", "/cart", "/open", "/legal"];

/**
 * A chat-style helper in the bottom-right corner. It waits about 10 seconds (or a good scroll),
 * then offers one path at a time, starting with the visitor's own. If they don't pick one, it
 * slides to the next. Closing it keeps it away for a week; a small button can reopen it.
 */
export function Helper() {
  const path = usePathname();
  const { role, helperClosedAt, closeHelper } = useJourney();
  const [phase, setPhase] = useState<"wait" | "open" | "mini">("wait");
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const shown = useRef(false);
  const hidden = HIDE_ON.some((p) => path.startsWith(p));

  const tips = useMemo(() => {
    const mine = TIPS.filter((t) => t.role === role);
    return [...mine, ...TIPS.filter((t) => t.role !== role)];
  }, [role]);

  // Appear after ~10s or a good scroll, once per visit, unless closed in the last week.
  useEffect(() => {
    if (hidden || shown.current) return;
    // Closed recently: only the small button comes back, never the bubble.
    const quiet = Date.now() - helperClosedAt < WEEK;
    const show = () => { if (!shown.current) { shown.current = true; setPhase(quiet ? "mini" : "open"); } };
    const t = setTimeout(show, 10_000);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max > 0 && scrollY / max > 0.35) show();
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); removeEventListener("scroll", onScroll); };
  }, [hidden, helperClosedAt]);

  // Slide to the next suggestion every 9s; after the last one, tuck away into the small button.
  useEffect(() => {
    if (phase !== "open" || paused || linkOpen) return;
    const t = setTimeout(() => (i + 1 >= tips.length ? setPhase("mini") : setI(i + 1)), 9_000);
    return () => clearTimeout(t);
  }, [phase, paused, i, tips.length, linkOpen]);

  if (hidden || phase === "wait") return null;
  const bottom = "bottom-24 lg:bottom-6";

  if (phase === "mini")
    return (
      <button onClick={() => { setI(0); setPhase("open"); }} aria-label="Help choosing"
        className={`pop fixed right-4 ${bottom} z-40 grid h-14 w-14 place-items-center rounded-2xl bg-night text-mint shadow-[0_10px_30px_rgba(23,32,27,0.25)]`}>
        <Icon name="chat" />
      </button>
    );

  const t = tips[i];
  const close = () => { closeHelper(); setPhase("mini"); setLinkOpen(false); };
  return (
    <aside aria-live="polite" aria-label="Suggestions" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}
      className={`fixed right-4 ${bottom} z-40 w-[min(360px,calc(100vw-2rem))]`}>
      <div key={t.key} className="rise rounded-3xl bg-paper p-4 shadow-[0_18px_50px_rgba(23,32,27,0.18)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-night text-mint"><Icon name="sun" size={18} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold">Solar Builders</p>
            <p className="text-xs text-mute">Usually replies in minutes</p>
          </div>
          <button onClick={close} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-haze" aria-label="Close suggestions"><Icon name="close" size={16} /></button>
        </div>
        <div className="mt-3 rounded-2xl rounded-tl-md bg-haze p-3.5">
          <p className="flex items-center gap-2 font-semibold"><Icon name={t.icon} size={18} className="text-sun-deep" />{t.title}</p>
          <p className="mt-1 text-sm text-ink-2">{t.text}</p>
        </div>
        {t.link && linkOpen ? (
          <div className="mt-3"><OpenLinkForm label="Link or code" onDone={() => setPhase("mini")} autoFocus /></div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            {t.link ? (
              <button onClick={() => setLinkOpen(true)} className="btn btn-ink flex-1 !py-2.5 text-sm">{t.cta}</button>
            ) : t.href?.startsWith("http") ? (
              <a href={t.href} target="_blank" rel="noopener" onClick={() => setPhase("mini")} className="btn btn-ink flex-1 !py-2.5 text-sm">{t.cta}</a>
            ) : (
              <Link href={t.href!} onClick={() => setPhase("mini")} className="btn btn-ink flex-1 !py-2.5 text-sm">{t.cta}</Link>
            )}
            <button onClick={() => (i + 1 >= tips.length ? setPhase("mini") : setI(i + 1))} className="btn btn-ghost !px-3.5 !py-2.5 text-sm" aria-label="Show another suggestion">
              Next <Icon name="chevron" size={16} />
            </button>
          </div>
        )}
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {tips.map((x, k) => <span key={x.key} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-ink" : "w-1.5 bg-line"}`} />)}
        </div>
      </div>
    </aside>
  );
}
