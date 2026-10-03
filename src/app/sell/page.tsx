"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Field } from "@/components/Field";

export default function Sell() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: { name: string } | null; store: { slug: string } | null } | null>(null);
  const [f, setF] = useState({ name: "", slug: "", bio: "", kind: "installer", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => { api<typeof me & object>("/me").then((m) => { setMe(m); if (m.store) router.replace("/account/store"); }); }, [router]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((x) => ({ ...x, [k]: v, ...(k === "name" && !x.slug ? {} : {}) }));
  };
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Sell solar. Earn on every sale.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Installers, technicians and anyone with people who need power: get your own store link, put setups together for clients and get paid a commission on every order through you. We handle stock, payment and delivery.</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 pt-12 lg:grid-cols-[1fr_420px]">
        <ol className="space-y-5">
          {[
            ["Open your store", "Pick a link like solar-ng.vercel.app/s/your-name. It shows all our products and your own setups."],
            ["Build for a client", "Add the right inverter, battery and panels to your cart, then “Share this build”. Send the link on WhatsApp."],
            ["They pay us directly", "Your client pays by card, splits it with friends or pays small small. We deliver and you install."],
            ["You earn", "Every order through your link or build earns you a commission, tracked on your dashboard."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4"><span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun text-lg font-bold">{i + 1}</span><span><span className="block font-semibold">{t}</span><span className="text-ink-2">{d}</span></span></li>
          ))}
        </ol>
        <div className="h-fit rounded-2xl border border-line bg-paper p-5">
          {!me ? <p className="text-mute">Loading…</p> : !me.user ? (
            <div><p className="font-semibold">Create an account to open your store.</p><Link href="/account?next=/sell" className="btn btn-ink mt-4 w-full">Sign in or create account</Link></div>
          ) : (
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault(); setMsg(""); setErrors({});
              try { await api("/stores", { body: f }); router.push("/account/store"); } catch (x) { const ex = x as Error & { fields?: Record<string, string> }; setMsg(ex.message); setErrors(ex.fields || {}); }
            }}>
              <p className="font-semibold">Your store</p>
              <Field label="Store name" error={errors.name}><input className="field" maxLength={60} placeholder="e.g. Tunde Solar Works" value={f.name} onChange={set("name")} /></Field>
              <Field label="Link name" hint={`Your link: /s/${f.slug || "your-name"}`} error={errors.slug}><input className="field" maxLength={30} placeholder="tunde-solar" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Field>
              <Field label="I am"><select className="field" value={f.kind} onChange={set("kind")}><option value="installer">A solar installer / technician</option><option value="affiliate">Recommending to friends & followers</option></select></Field>
              <Field label="About you (optional)"><textarea className="field" rows={3} maxLength={300} placeholder="e.g. 6 years installing in Lekki and Ajah. Inverter repairs too." value={f.bio} onChange={set("bio")} /></Field>
              <Field label="WhatsApp number (optional)"><input className="field" type="tel" value={f.whatsapp} onChange={set("whatsapp")} /></Field>
              {msg && <p role="alert" className="text-sm text-flare">{msg}</p>}
              <button className="btn btn-sun w-full">Open my store</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
