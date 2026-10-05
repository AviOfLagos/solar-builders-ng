"use client";
import Link from "next/link";
import { Icon } from "./Icon";
import { Logo } from "../Logo";

/** "Step 2 of 3" with a segmented bar. Counts down near the end (docs/DESIGN.md rule 6). */
export function StepBar({ step, total, onBack, label }: { step: number; total: number; onBack?: () => void; label?: string }) {
  const left = total - step;
  const text = label ?? (left === 0 ? "Last step" : step === 1 ? `Step 1 of ${total}` : left === 1 ? "1 step left" : `Step ${step} of ${total}`);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-xl bg-paper" aria-label="Back"><Icon name="back" size={20} /></button>
        ) : <span className="w-10" />}
        <span className="text-sm font-semibold text-ink-2">{text}</span>
        <span className="w-10" />
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
        {Array.from({ length: total }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-ink" : "bg-line"}`} />)}
      </div>
    </div>
  );
}

/**
 * The frame for every step-by-step flow: logo bar, progress, one question, and a footer button that
 * names the next step. Desktop centres it in a calm column; phones get it full width.
 */
export function Flow({ step, total, onBack, label, title, sub, footer, children, aside }: {
  step: number; total: number; onBack: () => void; label?: string; title: React.ReactNode; sub?: React.ReactNode;
  footer?: React.ReactNode; children?: React.ReactNode; aside?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Home"><Logo /></Link>
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-paper" aria-label="Close"><Icon name="close" size={20} /></Link>
      </div>
      <div className={`mx-auto grid max-w-6xl gap-10 px-4 pb-40 pt-2 ${aside ? "lg:grid-cols-[1fr_380px]" : ""}`}>
        <div className={`mx-auto w-full ${aside ? "" : "max-w-xl"}`}>
          <StepBar step={step} total={total} onBack={onBack} label={label} />
          <div key={step} className="rise mt-8">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
            {sub && <p className="mt-3 text-ink-2">{sub}</p>}
            <div className="mt-7 space-y-4">{children}</div>
          </div>
        </div>
        {aside && <aside className="hidden lg:block">{aside}</aside>}
      </div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-haze/90 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className={`mx-auto w-full space-y-2 px-4 py-4 ${aside ? "max-w-6xl lg:pr-[436px]" : "max-w-xl"}`}>{footer}</div>
        </div>
      )}
    </div>
  );
}

/** A big tappable answer for one-question steps. */
export function Option({ icon, title, sub, on, onClick, right }: { icon?: string; title: string; sub?: string; on?: boolean; onClick: () => void; right?: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={!!on} onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-3xl border-[1.5px] p-4 text-left transition-[transform,background-color] active:scale-[.99] ${on ? "border-ink bg-mint-tint" : "border-transparent bg-paper hover:border-line"}`}>
      {icon && <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${on ? "bg-mint" : "bg-haze"}`}><Icon name={icon} /></span>}
      <span className="min-w-0 flex-1"><span className="block font-bold">{title}</span>{sub && <span className="mt-0.5 block text-sm text-ink-2">{sub}</span>}</span>
      {right ?? <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-ink bg-ink text-mint" : "border-line"}`}>{on && <Icon name="check" size={14} stroke={3} />}</span>}
    </button>
  );
}

/** A full-width primary button with an arrow. */
export function Next({ children, onClick, disabled, busy, icon = "arrow", type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; icon?: string; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} className="btn btn-ink w-full !py-4 text-base">
      {busy ? "One moment…" : <>{children}<Icon name={icon} size={18} /></>}
    </button>
  );
}
