"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

export type Option = { value: string; label: string };

/**
 * Our dropdown: looks like the other fields, opens a list in our own style instead of the
 * phone's native picker. Keyboard: arrows, Home/End, Enter/Space, Escape, and type to jump.
 */
export function Select({ id, value, onChange, options, placeholder = "Choose…", invalid }: {
  id?: string; value: string; onChange: (v: string) => void; options: readonly Option[]; placeholder?: string; invalid?: boolean;
}) {
  const auto = useId();
  const btnId = id ?? `sel-${auto}`;
  const listId = `${btnId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => { if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" }); }, [open, active]);

  const show = () => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const pick = (i: number) => { const o = options[i]; if (o) onChange(o.value); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={root} className="relative">
      <button id={btnId} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined} aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}
        className="field flex items-center justify-between gap-2 text-left">
        <span className={current ? "" : "text-mute"}>{current?.label ?? placeholder}</span>
        <Icon name="down" size={18} className={`shrink-0 text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul ref={list} id={listId} role="listbox" aria-labelledby={btnId}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-auto rounded-2xl bg-paper p-1.5 shadow-[0_16px_40px_rgba(23,32,27,0.16)] ring-1 ring-line">
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={on}
                onPointerEnter={() => setActive(i)} onClick={() => pick(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] ${i === active ? "bg-haze" : ""} ${on ? "font-semibold text-ink" : "text-ink-2"}`}>
                <span>{o.label}</span>
                {on && <Icon name="check" size={18} className="shrink-0 text-sun-deep" stroke={2.4} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** A plain list of words as dropdown options. */
export const opts = (xs: readonly string[]): Option[] => xs.map((x) => ({ value: x, label: x }));
