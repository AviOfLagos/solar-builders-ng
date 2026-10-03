"use client";
import { useState } from "react";
export function Subscribe() {
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  return state === "done" ? (
    <p className="text-sm text-sun">You're on the list. We'll email you before every Solar Friday.</p>
  ) : (
    <form
      className="flex max-w-sm gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        const email = new FormData(e.currentTarget).get("email");
        const r = await fetch("/api/v1/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, source: "footer" }) });
        setState(r.ok ? "done" : (await r.json()).error || "Try again.");
      }}
    >
      <label className="sr-only" htmlFor="sub-email">Email</label>
      <input id="sub-email" name="email" type="email" required placeholder="Email for Solar Friday deals" className="field !rounded-full !border-white/20 !bg-white/10 !text-white placeholder:text-white/50" />
      <button className="btn btn-sun shrink-0 !px-4 !py-2" disabled={state === "busy"}>Notify me</button>
      {state !== "idle" && state !== "busy" && <p className="sr-only" role="alert">{state}</p>}
    </form>
  );
}
