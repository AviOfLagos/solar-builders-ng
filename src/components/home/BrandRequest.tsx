"use client";
import { track } from "@/components/Tracker";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/Field";
import { api, type ApiError } from "@/lib/client";

/** The open slot on the brand wall: brands ask to be stocked and featured. */
export function BrandRequest() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ brand: "", name: "", phone: "", email: "", products: "", site: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: "" }); };

  return (
    <>
      <button onClick={() => setOpen(true)} className="group flex h-36 w-full flex-col items-center justify-center gap-2 rounded-3xl border-[1.5px] border-dashed border-ink/25 p-5 text-center transition-colors hover:border-ink hover:bg-paper sm:h-44">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-xl font-light transition-transform group-hover:rotate-90">+</span>
        <span className="font-semibold">Your brand here</span>
        <span className="hidden text-xs text-mute sm:block">Make solar gear? Ask us to stock it.</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label="Feature your brand">
          <button className="absolute inset-0 bg-ink/30" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="rise relative m-3 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="tag">For brands</span>
                <p className="mt-3 text-2xl font-semibold">Get your products in front of Lagos homes</p>
                <p className="mt-1 text-sm text-ink-2">Tell us about your brand. Our team replies on WhatsApp within a working day.</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-haze" aria-label="Close"><Icon name="close" size={18} /></button>
            </div>
            {state === "done" ? (
              <div className="mt-6 rounded-3xl bg-mint-tint p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint"><Icon name="check" /></span>
                <p className="mt-3 font-semibold">Thanks, {f.name.split(" ")[0]}. We&apos;ve got it.</p>
                <p className="text-sm text-ink-2">We&apos;ll message {f.phone} about stocking {f.brand}.</p>
              </div>
            ) : (
              <form noValidate className="mt-6 space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                if (state === "busy") return;
                setState("busy"); setMsg("");
                try { await api("/brand-requests", { body: f }); track("brand-request"); setState("done"); }
                catch (x) { setMsg((x as Error).message); setErrors((x as ApiError).fields || {}); setState("idle"); }
              }}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Brand" error={errors.brand}><input className="field" maxLength={80} value={f.brand} onChange={set("brand")} /></Field>
                  <Field label="Your name" error={errors.name}><input className="field" maxLength={80} autoComplete="name" value={f.name} onChange={set("name")} /></Field>
                  <Field label="WhatsApp number" error={errors.phone}><input className="field" type="tel" inputMode="tel" placeholder="0803 123 4567" value={f.phone} onChange={set("phone")} /></Field>
                  <Field label="Email (optional)" error={errors.email}><input className="field" type="email" inputMode="email" maxLength={120} value={f.email} onChange={set("email")} /></Field>
                </div>
                <Field label="What do you make? (optional)"><input className="field" maxLength={300} placeholder="Inverters, lithium batteries, panels…" value={f.products} onChange={set("products")} /></Field>
                <Field label="Website (optional)"><input className="field" maxLength={200} inputMode="url" value={f.site} onChange={set("site")} /></Field>
                {msg && <p role="alert" className="text-sm text-flare">{msg}</p>}
                <button className="btn btn-ink w-full" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send request"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
