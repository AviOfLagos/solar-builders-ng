"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Line = { id: string; qty: number };
type CartState = {
  lines: Line[];
  open: boolean;
  add: (id: string, qty?: number) => void;
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
      setQty: (id, qty) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)) })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "sb-cart", partialize: (s) => ({ lines: s.lines }) }
  )
);
