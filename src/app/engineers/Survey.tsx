"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/ui/Icon";
import { StepBar } from "@/components/ui/Flow";
import { Select, opts } from "@/components/ui/Select";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { REGIONS } from "@/config/store";
import { QUESTIONS, STEPS, SAMPLE, YEARS, JOBS_PER_MONTH, TEAM_SIZES, type Question } from "@/data/engineer-survey";

const MIN_ANSWERS = 6;
/** Seconds: one answer, or one note for everything. Both stay well under the 4 MB upload limit at 24 kbps. */
const LIMIT = { one: 180, all: 600 };
const DRAFT = "sb_installer_draft_v1";
const REGION_OPTS = REGIONS.map((r) => ({ value: r.key, label: r.label }));

type Me = { name: string; phone: string; email: string; region: string; years: string; jobsPerMonth: string; teamSize: string };
type Rec = { status: "recording" | "paused" | "working"; key: string; secs: number };
type Photo = { path: string; preview?: string };
const BLANK: Me = { name: "", phone: "", email: "", region: "", years: "", jobsPerMonth: "", teamSize: "" };

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

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const numberOf = (key: string) => QUESTIONS.findIndex((q) => q.key === key) + 1;

/**
 * "Join our installer network": a six-step interview. Progress sits at the top; while recording, the
 * bottom bar becomes the recorder (pause, resume, done, discard) so it's always clear whether we're listening.
 */
export function Survey() {
  const [step, setStep] = useState(0);
  const [me, setMe] = useState<Me>(BLANK);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [voice, setVoice] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [rec, setRec] = useState<Rec | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const loaded = useRef(false);

  // Pick up where they left off (the sample quote opens in a new tab, and phones reload tabs).
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved draft once on load
      if (d) { setMe({ ...BLANK, ...d.me }); setAnswers(d.answers ?? {}); setVoice(d.voice ?? []); setPhotos((d.photos ?? []).map((path: string) => ({ path }))); setStep(Math.min(d.step ?? 0, STEPS.length - 1)); }
    } catch { /* no saved draft */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || done) return;
    try { localStorage.setItem(DRAFT, JSON.stringify({ me, answers, voice, photos: photos.map((p) => p.path), step })); } catch { /* storage off */ }
  }, [me, answers, voice, photos, step, done]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 7000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const answered = QUESTIONS.filter((q) => answers[q.key]?.trim()).length;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const youOk = /\p{L}.*\p{L}/u.test(me.name) && me.phone.replace(/\D/g, "").length >= 10;

  // ---- the recorder ----
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const discard = useRef(false);
  const paused = useRef(false);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); mr.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  const startRec = async (key: string) => {
    if (rec) return;
    const type = recordingType();
    if (type === null) { setNotice({ text: "This browser can't record. Type your answer instead.", bad: true }); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setNotice({ text: "Allow the microphone to record, or type your answer.", bad: true }); return; }
    const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 24000 } : undefined);
    const chunks: Blob[] = [];
    const limit = key === "all" ? LIMIT.all : LIMIT.one;
    discard.current = false; paused.current = false;
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      if (discard.current) { setRec(null); return; }
      setRec((x) => (x ? { ...x, status: "working" } : x));
      try {
        const blob = new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] });
        const f = new FormData();
        f.append("audio", blob, `answer.${blob.type.split("/")[1] || "webm"}`);
        f.append("key", key);
        const res = await upload<{ text?: string; answers?: Record<string, string>; voice: string }>("/engineer-survey/voice", f);
        if (res.voice) setVoice((v) => [...v, res.voice]);
        if (key === "all") {
          const got = Object.entries(res.answers ?? {});
          if (!got.length) setNotice({ text: "We didn't hear anyone speaking. Hold the phone closer and try again.", bad: true });
          else {
            setAnswers((a) => ({ ...a, ...Object.fromEntries(got.filter(([k]) => !a[k]?.trim())) }));
            setNotice({ text: `Filled ${got.length} answer${got.length === 1 ? "" : "s"} from your voice note. Check them as you go.` });
          }
        } else if (!res.text) setNotice({ text: "We didn't hear anyone speaking. Hold the phone closer and try again.", bad: true });
        else {
          setAnswers((a) => ({ ...a, [key]: a[key]?.trim() ? `${a[key].trim()}\n${res.text}` : res.text! }));
          setNotice({ text: `Added to question ${numberOf(key)}.` });
        }
      } catch (e) { setNotice({ text: (e as Error).message, bad: true }); }
      setRec(null);
    };
    mr.current = r;
    r.start(1000);
    setRec({ status: "recording", key, secs: 0 });
    timer.current = setInterval(() => {
      if (paused.current) return;
      setRec((x) => {
        if (!x || x.status !== "recording") return x;
        if (x.secs + 1 >= limit) { mr.current?.stop(); return { ...x, secs: limit }; }
        return { ...x, secs: x.secs + 1 };
      });
    }, 1000);
  };
  const pause = () => { if (mr.current?.state === "recording") { mr.current.pause(); paused.current = true; setRec((x) => (x ? { ...x, status: "paused" } : x)); } };
  const resume = () => { if (mr.current?.state === "paused") { mr.current.resume(); paused.current = false; setRec((x) => (x ? { ...x, status: "recording" } : x)); } };
  const finish = () => { if (mr.current && mr.current.state !== "inactive") mr.current.stop(); };
  const cancel = () => { discard.current = true; finish(); };

  // ---- photos and sending ----
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoBusy(true);
    for (const file of [...files].slice(0, 3 - photos.length)) {
      try {
        const f = new FormData();
        f.append("photo", await shrink(file), "install.jpg");
        const r = await upload<{ path: string }>("/engineer-survey/photo", f);
        setPhotos((p) => [...p, { path: r.path, preview: URL.createObjectURL(file) }]);
      } catch (e) { setNotice({ text: (e as Error).message, bad: true }); break; }
    }
    setPhotoBusy(false);
  };
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      await api("/engineer-survey", { body: { ...me, answers, consent, voice, photos: photos.map((p) => p.path) } });
      try { localStorage.removeItem(DRAFT); } catch { /* storage off */ }
      setDone(true); window.scrollTo({ top: 0 });
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };

  if (done)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Link href="/" aria-label="Home"><Logo /></Link>
        <h1 className="mt-10 font-display text-4xl font-bold">Thank you, {me.name.split(" ")[0]}.</h1>
        <p className="mt-3 text-lg text-ink-2">We review every interview. You&apos;ll hear from us on WhatsApp{me.email ? " or email" : ""} either way.</p>
      </div>
    );

  const field = (id: string, label: string, el: React.ReactNode) => <div className="space-y-1.5 text-sm"><label htmlFor={id} className="block font-medium">{label}</label>{el}</div>;
  const ask = (q: Question) => {
    const live = rec?.key === q.key;
    return (
      <div key={q.key} className={`space-y-2 rounded-3xl p-4 transition-colors ${live ? "bg-mint-tint ring-2 ring-ink" : "bg-paper"}`}>
        <label htmlFor={`q-${q.key}`} className="block font-semibold leading-snug"><span className="num text-mute">{numberOf(q.key)}.</span> {q.q}</label>
        {q.hint && <p className="text-sm text-mute">{q.hint}</p>}
        <textarea id={`q-${q.key}`} rows={3} className="field" value={answers[q.key] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder="Type here, or record" />
        <button type="button" disabled={!!rec} onClick={() => startRec(q.key)}
          className="inline-flex items-center gap-2.5 rounded-2xl border border-ink/15 bg-paper py-2 pl-2 pr-4 text-sm font-semibold shadow-[0_2px_0_rgba(23,32,27,0.12)] transition hover:-translate-y-px hover:border-ink/40 hover:shadow-[0_4px_10px_rgba(23,32,27,0.12)] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-flare text-white"><Icon name="mic" size={17} stroke={2.2} /></span>
          {live ? "Recording…" : answers[q.key]?.trim() ? "Tap to record more" : "Tap to record your answer"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-40">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-haze/90 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto max-w-xl space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Home"><Logo /></Link>
            <span className="num text-sm text-ink-2">{answered} of {QUESTIONS.length} answered</span>
          </div>
          <StepBar step={step + 1} total={STEPS.length} onBack={step > 0 && !rec ? () => setStep(step - 1) : undefined} label={`Step ${step + 1} of ${STEPS.length} · ${s.title}`} />
          {notice && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${notice.bad ? "bg-flare/10 text-flare" : "bg-mint-tint text-ink"}`}>{notice.text}</p>}
        </div>
      </header>

      <main key={step} className="rise mx-auto max-w-xl space-y-4 px-4 pt-6">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-sun-deep">Solar installers in Lagos</p>
              <h1 className="font-display text-4xl font-bold leading-tight">Join our installer network.</h1>
              <p className="text-ink-2">We sell solar systems to homes and shops across Lagos and pay vetted installers to fit them. This interview is how we pick who we work with. Six short steps; type, or tap the mic and talk.</p>
            </div>
            <div className="grid gap-3 rounded-3xl bg-paper p-4 sm:grid-cols-2">
              {field("s-name", "Full name", <input id="s-name" className="field" value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} autoComplete="name" />)}
              {field("s-phone", "WhatsApp number", <input id="s-phone" className="field" inputMode="tel" value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} placeholder="0803 123 4567" autoComplete="tel" />)}
              {field("s-email", "Email (optional)", <input id="s-email" className="field" type="email" value={me.email} onChange={(e) => setMe({ ...me, email: e.target.value })} autoComplete="email" />)}
              {field("s-region", "Where you mostly work", <Select id="s-region" value={me.region} onChange={(v) => setMe({ ...me, region: v })} options={REGION_OPTS} />)}
              {field("s-years", "Years installing solar", <Select id="s-years" value={me.years} onChange={(v) => setMe({ ...me, years: v })} options={opts(YEARS)} />)}
              {field("s-jobs", "Installs a month", <Select id="s-jobs" value={me.jobsPerMonth} onChange={(v) => setMe({ ...me, jobsPerMonth: v })} options={opts(JOBS_PER_MONTH)} />)}
              <div className="sm:col-span-2">{field("s-team", "Your team", <Select id="s-team" value={me.teamSize} onChange={(v) => setMe({ ...me, teamSize: v })} options={opts(TEAM_SIZES)} />)}</div>
            </div>
          </>
        )}

        {step > 0 && (
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold leading-tight">{s.title}</h1>
            <p className="text-ink-2">{s.sub}</p>
          </div>
        )}

        {s.key === "brands" && (
          rec?.key === "all" ? (
            <div className="space-y-2 rounded-3xl bg-night p-5 text-white">
              <p className="font-semibold">Talk through these, in any order</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-white/80">{QUESTIONS.map((q) => <li key={q.key}>{q.q}{q.step === "sample" ? " (about our sample quote)" : ""}</li>)}</ol>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-3xl bg-night p-5 text-white sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-semibold">Rather talk?</p><p className="text-sm text-white/70">Record one voice note for every question, up to 10 minutes. We fill in the answers and you check them.</p></div>
              <button type="button" disabled={!!rec} onClick={() => startRec("all")}
                className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-mint py-3 pl-3 pr-5 text-base font-bold text-ink shadow-[0_4px_0_#7cc463] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_#7cc463] active:translate-y-1 active:shadow-none disabled:opacity-50">
                <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-flare text-white">
                  <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-flare/40 group-disabled:hidden motion-reduce:hidden" />
                  <Icon name="mic" size={20} stroke={2.2} className="relative" />
                </span>
                Tap to record
              </button>
            </div>
          )
        )}

        {s.key === "sample" && (
          <div className="space-y-3 rounded-3xl bg-night p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-xs text-white/60">Sample quote {SAMPLE.version}</p><p className="text-lg font-semibold">{SAMPLE.client.building}, {SAMPLE.client.area}</p></div>
              <Icon name="doc" className="shrink-0 text-mint" />
            </div>
            <p className="text-sm text-white/75">Runs {SAMPLE.client.runs.join(", ").toLowerCase()}. {SAMPLE.client.hours}.</p>
            <p className="text-sm text-white/75">{SAMPLE.kit.contents.join(" · ")}</p>
            <div className="flex flex-wrap justify-between gap-2 border-t border-white/15 pt-3 text-sm"><span>Equipment <b className="num">{naira(SAMPLE.kit.price)}</b></span><span className="text-white/70">Install {naira(SAMPLE.install[0])}–{naira(SAMPLE.install[1])}</span></div>
            <a href="/engineers/sample-quote" target="_blank" rel="noopener" className="btn btn-sun w-full">Open the full sample quote</a>
          </div>
        )}

        {QUESTIONS.filter((q) => q.step === s.key).map(ask)}

        {s.key === "work" && (
          <>
            <div className="space-y-3 rounded-3xl bg-paper p-4">
              <p className="font-semibold">Photos of your work</p>
              <p className="text-sm text-mute">Up to 3 installs you did: inverter and battery wiring, panel mounting, the distribution board.</p>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={p.path} className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-haze text-sm text-mute">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the installer's own file */}
                      {p.preview ? <img src={p.preview} alt={`Install photo ${i + 1}`} className="h-full w-full object-cover" /> : `Photo ${i + 1}`}
                      <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.path !== p.path))} className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-white">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 3 && (
                <label className="btn btn-ghost w-full cursor-pointer">
                  <Icon name="camera" size={18} />{photoBusy ? "Uploading…" : "Add photos"}
                  <input id="s-photos" type="file" accept="image/*" multiple className="sr-only" disabled={photoBusy} onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <label className="flex items-start gap-2 rounded-3xl bg-paper p-4 text-sm"><input id="s-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />You can contact me on WhatsApp{me.email ? " and email" : ""} about my application and about jobs.</label>
            {err && <p role="alert" className="rounded-xl bg-flare/10 p-3 text-sm text-flare">{err}</p>}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-haze/95 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto max-w-xl px-4 py-3">
          {rec ? <RecordBar rec={rec} onPause={pause} onResume={resume} onDone={finish} onCancel={cancel} />
            : last ? (
              <button disabled={busy || photoBusy || answered < MIN_ANSWERS || !consent} onClick={submit} className="btn btn-ink w-full">
                {busy ? "Sending…" : answered < MIN_ANSWERS ? `Answer at least ${MIN_ANSWERS} questions (${answered} so far)` : !consent ? "Tick the box above to send" : "Send my interview"}
              </button>
            ) : (
              <button disabled={step === 0 && !youOk} onClick={() => setStep(step + 1)} className="btn btn-ink w-full">
                {step === 0 && !youOk ? "Add your name and WhatsApp number" : `Next: ${STEPS[step + 1].title}`}<Icon name="arrow" size={18} />
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

/** The recorder: always on screen while it's listening, with pause, done and discard. */
function RecordBar({ rec, onPause, onResume, onDone, onCancel }: { rec: Rec; onPause: () => void; onResume: () => void; onDone: () => void; onCancel: () => void }) {
  const limit = rec.key === "all" ? LIMIT.all : LIMIT.one;
  const left = limit - rec.secs;
  const what = rec.key === "all" ? "All your answers" : `Question ${numberOf(rec.key)}`;
  if (rec.status === "working")
    return <div role="status" className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-night text-sm font-semibold text-white"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-mint" />Writing down your voice note…</div>;
  const on = rec.status === "recording";
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-night p-2 text-white" role="group" aria-label="Recorder">
      <button type="button" onClick={onCancel} aria-label="Discard this recording" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-night-soft"><Icon name="close" size={20} /></button>
      <div className="min-w-0 flex-1 px-1" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? "animate-pulse bg-flare" : "bg-white/40"}`} />{on ? "Recording" : "Paused"} · <span className="num">{clock(rec.secs)}</span></p>
        <p className={`truncate text-xs ${left <= 30 ? "text-lemon" : "text-white/60"}`}>{what}{left <= 30 ? ` · ${left}s left` : ` · up to ${clock(limit)}`}</p>
      </div>
      <button type="button" onClick={on ? onPause : onResume} aria-label={on ? "Pause" : "Resume"} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-night-soft"><Icon name={on ? "pause" : "play"} size={20} /></button>
      <button type="button" onClick={onDone} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-mint px-4 text-sm font-bold text-ink"><Icon name="stop" size={18} />Done</button>
    </div>
  );
}
