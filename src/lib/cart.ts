"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Line = { id: string; qty: number };
type CartState = {
  lines: Line[];
  open: boolean;
  add: (id: string, qty?: number) => void;
  addMany: (items: Line[]) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (o: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (id, qty = 1) =>
        set((s) => {
          const ex = s.lines.find((l) => l.id === id);
          const lines = ex ? s.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(20, l.qty + qty) } : l)) : [...s.lines, { id, qty }];
          return { lines, open: true };
        }),
      addMany: (items) =>
        set((s) => {
          const lines = [...s.lines];
          for (const it of items) {
            const ex = lines.find((l) => l.id === it.id);
            if (ex) ex.qty = Math.min(20, ex.qty + it.qty);
            else lines.push({ ...it });
          }
          return { lines: lines.map((l) => ({ ...l })), open: true };
        }),
      setQty: (id, qty) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)) })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "sb-cart", partialize: (s) => ({ lines: s.lines }) }
  )
);
