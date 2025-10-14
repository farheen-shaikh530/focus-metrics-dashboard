import { create } from "zustand";

type Prefs = {
  theme: "light" | "dark";
  pepTalkStyle: "funny" | "coach" | "calm";
  defaultTab: "active" | "in-progress" | "done";
  focusMinutes: number;
  set: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
};

const KEY = "prefs";
const fallback: Omit<Prefs,"set"> = {
  theme: "light",
  pepTalkStyle: "coach",
  defaultTab: "active",
  focusMinutes: 25,
};
const load = (): Omit<Prefs,"set"> => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return fallback; }
};

export const usePrefs = create<Prefs>((set) => ({
  ...load(),
  set: (k, v) => set(s => {
    const next = { ...s, [k]: v };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }),
}));