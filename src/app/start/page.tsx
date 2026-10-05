"use client";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flow, Next, Option } from "@/components/ui/Flow";
import { GoogleButton } from "@/components/GoogleButton";
import { ROLES, useJourney, type Role } from "@/lib/journey";
import { api } from "@/lib/client";

const PHOTO: Record<Role, string> = { home: "/photos/home.jpg", gift: "/photos/gift.jpg", group: "/photos/group.jpg", pro: "/photos/pro.jpg" };
const ACCOUNT_COPY: Record<Role, string> = {
  home: "Keep your kit, track delivery and save your address for next time.",
  gift: "Follow the delivery to your person and get updates wherever you are.",
  group: "You'll need one to start a page or a squad. Chipping in doesn't.",
  pro: "Your shared lists, clients' orders and earnings stay in one place.",
};

/**
 * Getting started, same as the app's welcome: what brings you here, then sign in or skip.
 * New accounts land on the first step (?step=role&new=1) and go straight to their path after.
 */
function Start() {
  const router = useRouter();
  const q = useSearchParams();
  const fresh = q.get("new") === "1";
  const { role, setRole, finish } = useJourney();
  const [pick, setPick] = useState<Role | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => { api<{ user: unknown }>("/me").then((m) => setSignedIn(!!m.user)).catch(() => setSignedIn(false)); }, []);
  const chosen = pick ?? role;
  const dest = ROLES.find((r) => r.key === chosen)?.href ?? "/find";
  const go = () => { finish(); router.push(dest); };

  if (step === 1)
    return (
      <Flow step={1} total={signedIn ? 1 : 2} onBack={() => router.back()} label={fresh ? "Welcome! One quick question" : undefined}
        title={fresh ? <>Welcome. What brings <span className="hl">you</span> here?</> : <>What brings <span className="hl">you</span> here?</>}
        sub="We'll shape the site around it. Everything else stays one tap away, and you can change this any time."
        footer={<Next disabled={!chosen} onClick={() => { if (!chosen) return; setRole(chosen); if (signedIn) go(); else setStep(2); }}>{signedIn ? "Let's go" : "Continue"}</Next>}
        aside={
          <div className="sticky top-6 overflow-hidden rounded-[2rem]">
            <div className="relative h-[520px]">
              <Image src={chosen ? PHOTO[chosen] : "/photos/hero-tall.jpg"} alt="" fill sizes="380px" className="object-cover transition-opacity" />
            </div>
          </div>
        }>
        <div role="radiogroup" className="space-y-3">
          {ROLES.map((r) => <Option key={r.key} icon={r.icon} title={r.title} sub={r.sub} on={chosen === r.key} onClick={() => setPick(r.key)} />)}
        </div>
      </Flow>
    );

  const r = ROLES.find((x) => x.key === chosen)!;
  return (
    <Flow step={2} total={2} onBack={() => setStep(1)} label="Almost done" title="Save your progress?" sub={ACCOUNT_COPY[r.key]}
      footer={<button onClick={go} className="btn btn-ghost w-full !py-4 text-base">Skip for now. {r.cta}</button>}>
      <div className="relative h-48 overflow-hidden rounded-3xl"><Image src={PHOTO[r.key]} alt="" fill sizes="600px" className="object-cover" /></div>
      <div className="card space-y-4 p-6">
        <GoogleButton next={dest} />
        <Link href={`/account?mode=signup&next=${encodeURIComponent(dest)}`} onClick={() => finish()} className="btn btn-ghost w-full">Use email instead</Link>
        <p className="text-center text-sm text-mute">Already have an account? <Link href={`/account?next=${encodeURIComponent(dest)}`} onClick={() => finish()} className="font-semibold text-ink underline">Sign in</Link></p>
      </div>
      <p className="text-center text-sm text-mute">You can buy and chip in without an account.</p>
    </Flow>
  );
}

export default function Page() {
  return <Suspense><Start /></Suspense>;
}
