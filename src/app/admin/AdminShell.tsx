"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/ui/Icon";
import { GoogleButton } from "@/components/GoogleButton";
import { api } from "@/lib/client";

type Me = { user: { name: string; email: string } | null; team?: boolean };

const NAV: { title: string; links: { href: string; label: string; icon: string; soon?: string }[] }[] = [
  { title: "Overview", links: [
    { href: "/admin", label: "Dashboard", icon: "grid" },
    { href: "/admin/assistant", label: "Assistant", icon: "sparkle" },
  ] },
  { title: "Manage", links: [
    { href: "/admin/orders", label: "Orders", icon: "truck" },
    { href: "/admin/leads", label: "Leads", icon: "chat" },
    { href: "/admin/pools", label: "Go Solar Me", icon: "megaphone" },
    { href: "/admin/pricing", label: "Pricing", icon: "card" },
  ] },
  { title: "Coming next", links: [
    { href: "https://github.com/AviOfLagos/solar-builders-ng/issues/7", label: "Suppliers", icon: "people", soon: "#7" },
    { href: "https://github.com/AviOfLagos/solar-builders-ng/issues/7", label: "Installers", icon: "tools", soon: "#7" },
    { href: "https://github.com/AviOfLagos/solar-builders-ng/issues/6", label: "WhatsApp", icon: "whatsapp", soon: "#6" },
  ] },
];

/** The admin frame: sidebar, top bar, and a sign-in gate for the team. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => { api<Me>("/me").then(setMe).catch(() => setMe({ user: null })); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the phone menu on navigation
  useEffect(() => setMenu(false), [path]);

  if (!me) return <div className="grid min-h-screen place-items-center text-mute">Loading…</div>;
  if (!me.user || !me.team)
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card w-full max-w-sm space-y-4 p-7 text-center">
          <div className="flex justify-center"><Logo /></div>
          <h1 className="font-display text-3xl">Admin</h1>
          <p className="text-sm text-ink-2">{me.user ? `${me.user.email} isn't on the team list. Ask the owner to add it.` : "Sign in with your team Google account."}</p>
          {!me.user && <div className="flex justify-center"><GoogleButton next="/admin" /></div>}
          <Link href="/" className="block text-sm font-semibold underline">Back to the site</Link>
        </div>
      </div>
    );

  const current = NAV.flatMap((g) => g.links).find((l) => (l.href === "/admin" ? path === "/admin" : path.startsWith(l.href)));
  const side = (
    <nav className="flex h-full flex-col gap-6 p-4">
      <Link href="/admin" className="px-2 pt-1"><Logo /></Link>
      {NAV.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-mute">{g.title}</p>
          <ul className="space-y-0.5">
            {g.links.map((l) => {
              const on = current?.href === l.href && !l.soon;
              const cls = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.93rem] font-semibold transition-colors ${on ? "bg-night text-white" : "text-ink-2 hover:bg-haze hover:text-ink"}`;
              return (
                <li key={l.label}>
                  {l.soon ? (
                    <a href={l.href} target="_blank" rel="noopener" className={cls}><Icon name={l.icon} size={19} /><span className="flex-1">{l.label}</span><span className="rounded-md bg-lemon px-1.5 py-0.5 text-[10px] font-bold">{l.soon}</span></a>
                  ) : (
                    <Link href={l.href} className={cls}><Icon name={l.icon} size={19} className={on ? "text-mint" : ""} />{l.label}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto space-y-2">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-haze"><Icon name="back" size={18} />Back to the site</Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-haze lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line/70 bg-paper lg:block">{side}</aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={() => setMenu(false)} />
          <aside className="rise absolute inset-y-0 left-0 w-72 bg-paper shadow-2xl">{side}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line/70 bg-haze/85 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-paper lg:hidden" aria-label="Menu"><Icon name="menu" size={20} /></button>
          <p className="flex items-center gap-2 text-sm text-mute"><Icon name="home" size={16} /><span>/</span><span className="font-semibold text-ink">{current?.label ?? "Admin"}</span></p>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/assistant" className="hidden items-center gap-2 rounded-xl bg-mint px-3.5 py-2 text-sm font-bold sm:flex"><Icon name="sparkle" size={17} />Ask the assistant</Link>
            <span className="flex items-center gap-2 rounded-xl bg-paper py-1.5 pl-1.5 pr-3 text-sm">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-night text-xs font-bold text-mint">{me.user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden font-semibold sm:block">{me.user.name.split(" ")[0]}</span>
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
