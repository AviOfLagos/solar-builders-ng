"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { isEmail } from "@/lib/format";

export function Subscribe() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  return state === "done" ? (
    <p className="text-sm text-sun">You&apos;re on the list. We&apos;ll email you before every Solar Friday.</p>
  ) : (
    <form
      noValidate
      className="max-w-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email") || "").trim();
        if (!isEmail(email)) { setErr("Enter a valid email address."); return; }
        setState("busy"); setErr("");
        try { await api("/subscribe", { body: { email, source: "footer" } }); setState("done"); }
        catch (x) { setErr((x as Error).message); setState("idle"); }
      }}
    >
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="sub-email">Email</label>
        <input id="sub-email" name="email" type="email" inputMode="email" maxLength={120} placeholder="Email for Solar Friday deals" className="field !rounded-full !border-white/20 !bg-white/10 !text-white placeholder:text-white/50" onChange={() => setErr("")} />
        <button className="btn btn-sun shrink-0 !px-4 !py-2" disabled={state === "busy"}>{state === "busy" ? "…" : "Notify me"}</button>
      </div>
      {err && <p className="mt-2 text-sm text-sun" role="alert">{err}</p>}
    </form>
  );
}
