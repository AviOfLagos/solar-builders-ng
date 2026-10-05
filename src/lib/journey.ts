"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Why someone is here. Same four as the app (go-solar-me-app/src/lib/roles.ts). */
export type Role = "home" | "gift" | "group" | "pro";

export const ROLES: { key: Role; icon: string; title: string; sub: string; href: string; cta: string }[] = [
  { key: "home", icon: "home", title: "Power my home or business", sub: "Find the right kit and stop buying fuel.", href: "/find", cta: "Find my kit" },
  { key: "gift", icon: "gift", title: "Get solar for someone", sub: "Family or a friend in Lagos. Pay from anywhere.", href: "/find?who=someone", cta: "Find a kit for them" },
  { key: "group", icon: "people", title: "Raise or split the cost", sub: "Friends chip in, split with your squad, or pay small small.", href: "/go-solar-me", cta: "Go solar together" },
  { key: "pro", icon: "tools", title: "I install or resell solar", sub: "Build equipment lists, send them to clients, earn on every sale.", href: "/sell", cta: "Open the installer hub" },
];

export type PayPath = "share" | "now" | "someone" | "fund" | "squad" | "gift" | "small";
export const PATH_ORDER: Record<Role, PayPath[]> = {
  home: ["now", "small", "squad", "fund", "someone", "gift", "share"],
  gift: ["someone", "gift", "now", "fund", "squad", "small", "share"],
  group: ["fund", "squad", "small", "now", "someone", "gift", "share"],
  pro: ["share", "now", "someone", "small", "fund", "squad", "gift"],
};

type Journey = {
  role: Role | null;
  /** Finished /start (or skipped it). */
  onboarded: boolean;
  /** When the helper bubble was closed (ms); it stays away for a week. */
  helperClosedAt: number;
  finder: { segment: string | null; load: Record<string, number>; hours: number };
  setRole: (r: Role) => void;
  finish: () => void;
  closeHelper: () => void;
  setFinder: (f: Partial<Journey["finder"]>) => void;
};

export const useJourney = create<Journey>()(
  persist(
    (set) => ({
      role: null,
      onboarded: false,
      helperClosedAt: 0,
      finder: { segment: null, load: {}, hours: 8 },
      setRole: (role) => set({ role }),
      finish: () => set({ onboarded: true }),
      closeHelper: () => set({ helperClosedAt: Date.now() }),
      setFinder: (f) => set((s) => ({ finder: { ...s.finder, ...f } })),
    }),
    // Read from localStorage after the first render (see JourneyHydrator) so server and client HTML match.
    { name: "sb-journey", skipHydration: true },
  ),
);

/** Loads the saved journey once the page has hydrated. Mounted once in the root layout. */
export function JourneyHydrator() {
  useEffect(() => { void useJourney.persist.rehydrate(); }, []);
  return null;
}
