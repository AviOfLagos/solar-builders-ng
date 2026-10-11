"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { REGIONS } from "@/config/store";
import { QUESTIONS, YEARS, JOBS_PER_MONTH, TEAM_SIZES } from "@/data/engineer-survey";

const MIN_ANSWERS = 5;
const MAX_SECONDS = 240;

/** Posts a file to one of our upload routes and returns the JSON, or throws the route's message. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { method: "POST", body: form }).catch(() => null);
  if (!res) throw new Error("No connection. Check your data and try again.");
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "That didn't work. Try again.");
  return j as T;
}

/** The best format this browser can record that the transcriber also reads. */
function recordingType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/mp4", "audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

/** Tap to record, tap to stop. The recording is turned into text and handed back. */
function VoiceButton({ k, label, onDone, onBusy }: { k: string; label: string; onDone: (r: { text?: string; answers?: Record<string, string>; voice: string }) => void; onBusy?: (b: boolean) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); rec.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  const start = async () => {
    setErr("");
    const type = recordingType();
    if (type === null) { setErr("This browser can't record. Type your answer instead."); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setErr("Allow the microphone to record, or type your answer."); return; }
    const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const blob = new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] });
      setState("working"); onBusy?.(true);
      try {
        const f = new FormData();
        f.append("audio", blob, `answer.${blob.type.split("/")[1] || "webm"}`);
        f.append("key", k);
        onDone(await upload("/engineer-survey/voice", f));
      } catch (e) { setErr((e as Error).message); }
      setState("idle"); onBusy?.(false);
    };
    rec.current = r;
    r.start(1000);
    setSecs(0); setState("recording");
    timer.current = setInterval(() => setSecs((s) => { if (s + 1 >= MAX_SECONDS) r.stop(); return s + 1; }), 1000);
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={() => (state === "recording" ? rec.current?.stop() : start())} disabled={state === "working"}
        aria-pressed={state === "recording"}
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${state === "recording" ? "bg-flare text-white" : "bg-mint-tint text-ink"} disabled:opacity-60`}>
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${state === "recording" ? "animate-pulse bg-white" : "bg-flare"}`} />
        {state === "recording" ? `Stop · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : state === "working" ? "Writing it down…" : label}
      </button>
      {err && <span role="alert" className="text-xs text-flare">{err}</span>}
    </span>
  );
}

/** Shrinks a photo to 1600px JPEG before upload, so it goes up fast on mobile data. */
async function shrink(file: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.8));
  } catch { return file; }
}

export function Survey() {
  const [me, setMe] = useState({ name: "", phone: "", email: "", region: "", years: "", jobsPerMonth: "", teamSize: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [voice, setVoice] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const answered = QUESTIONS.filter((q) => answers[q.key]?.trim()).length;
  const busyVoice = (b: boolean) => setVoiceBusy((n) => n + (b ? 1 : -1));
  const keepVoice = (p: string) => p && setVoice((v) => [...v, p]);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoErr(""); setPhotoBusy(true);
    for (const file of [...files].slice(0, 3 - photos.length)) {
      try {
        const f = new FormData();
        f.append("photo", await shrink(file), "install.jpg");
        const r = await upload<{ path: string }>("/engineer-survey/photo", f);
        setPhotos((p) => [...p, { path: r.path, preview: URL.createObjectURL(file) }]);
      } catch (e) { setPhotoErr((e as Error).message); break; }
    }
    setPhotoBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/engineer-survey", { body: { ...me, answers, consent, voice, photos: photos.map((p) => p.path) } });
      setDone(true); window.scrollTo({ top: 0 });
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };

  if (done)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">Thank you, {me.name.split(" ")[0]}.</h1>
        <p className="mt-3 text-lg text-ink-2">We review every interview. You&apos;ll hear from us on WhatsApp{me.email ? " or email" : ""} either way.</p>
      </div>
    );

  const field = (id: string, label: string, el: React.ReactNode, wide = false) => <label htmlFor={id} className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}><span className="mb-1.5 block font-medium">{label}</span>{el}</label>;
  const select = (id: string, k: keyof typeof me, opts: readonly (string | { key: string; label: string })[]) => (
    <select id={id} className="field" value={me[k]} onChange={(e) => setMe({ ...me, [k]: e.target.value })}>
      <option value="">Choose…</option>
      {opts.map((o) => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-sun-deep">Solar installers in Lagos</p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Join our installer network.</h1>
        <p className="text-lg text-ink-2">We sell solar systems to homes and shops across Lagos and pay vetted installers to fit them. This short interview is how we pick who we work with. About 5 minutes. Type, or tap the mic and talk.</p>
      </header>

      <section className="card space-y-4 p-5">
        <p className="font-semibold">About you</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("s-name", "Full name", <input id="s-name" className="field" required value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} autoComplete="name" />)}
          {field("s-phone", "WhatsApp number", <input id="s-phone" className="field" required inputMode="tel" value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} placeholder="0803 123 4567" autoComplete="tel" />)}
          {field("s-email", "Email (optional)", <input id="s-email" className="field" type="email" value={me.email} onChange={(e) => setMe({ ...me, email: e.target.value })} autoComplete="email" />)}
          {field("s-region", "Where you mostly work", select("s-region", "region", REGIONS))}
          {field("s-years", "Years installing solar", select("s-years", "years", YEARS))}
          {field("s-jobs", "Installs you do in a month", select("s-jobs", "jobsPerMonth", JOBS_PER_MONTH))}
          {field("s-team", "Your team", select("s-team", "teamSize", TEAM_SIZES), true)}
        </div>
      </section>

      <section className="rounded-3xl bg-night p-5 text-white">
        <p className="font-semibold">Prefer to talk?</p>
        <p className="mt-1 text-sm text-white/70">Record one voice note answering the questions below, in any order, for up to 4 minutes. We&apos;ll fill in the answers; check them before you send.</p>
        <div className="mt-3">
          <VoiceButton k="all" label="Record all my answers" onBusy={busyVoice} onDone={(r) => { keepVoice(r.voice); setAnswers((a) => ({ ...a, ...Object.fromEntries(Object.entries(r.answers ?? {}).filter(([k]) => !a[k]?.trim())) })); }} />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl font-semibold">The interview</h2>
        {QUESTIONS.map((q, i) => (
          <div key={q.key} className="space-y-2">
            <label htmlFor={`q-${q.key}`} className="block font-medium"><span className="num text-mute">{i + 1}.</span> {q.q}</label>
            {q.hint && <p className="text-sm text-mute">{q.hint}</p>}
            <textarea id={`q-${q.key}`} rows={3} className="field" value={answers[q.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />
            <VoiceButton k={q.key} label="Record this answer" onBusy={busyVoice} onDone={(r) => { keepVoice(r.voice); if (r.text) setAnswers((a) => ({ ...a, [q.key]: a[q.key]?.trim() ? `${a[q.key].trim()}\n${r.text}` : r.text! })); }} />
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-5">
        <p className="font-semibold">Photos of your work</p>
        <p className="text-sm text-mute">Up to 3 photos of installs you did: inverter and battery wiring, panel mounting, the distribution board.</p>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.path} className="relative aspect-square overflow-hidden rounded-2xl bg-haze">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the installer's own file */}
                <img src={p.preview} alt={`Install photo ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.path !== p.path))} className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-white">Remove</button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 3 && (
          <label className="btn btn-ghost w-full cursor-pointer">
            {photoBusy ? "Uploading…" : "Add photos"}
            <input id="s-photos" type="file" accept="image/*" multiple className="sr-only" disabled={photoBusy} onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        {photoErr && <p role="alert" className="text-sm text-flare">{photoErr}</p>}
      </section>

      <section className="card space-y-4 p-5">
        <label className="flex items-start gap-2 text-sm"><input id="s-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />You can contact me on WhatsApp{me.email ? " and email" : ""} about my application and about jobs.</label>
        {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
        <button disabled={busy || voiceBusy > 0 || photoBusy || answered < MIN_ANSWERS || !consent} className="btn btn-ink w-full">
          {busy ? "Sending…" : voiceBusy > 0 ? "Writing down your voice note…" : answered < MIN_ANSWERS ? `Answer at least ${MIN_ANSWERS} questions (${answered}/${MIN_ANSWERS})` : !consent ? "Tick the box above to send" : "Send my interview"}
        </button>
      </section>
    </form>
  );
}
