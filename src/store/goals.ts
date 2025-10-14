import { create } from "zustand";
const KEY = "goals";

type Goals = {
  weeklyGoal: number;     // number of tasks to complete per week
  streakDays: number;     // consecutive days with ≥1 completion
  lastDoneDateISO: string | null;
  setWeeklyGoal: (n: number) => void;
  bumpOnDone: (completedAtISO: string) => void;
};

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
};

export const useGoals = create<Goals>((set, get) => ({
  weeklyGoal: 7,
  streakDays: 0,
  lastDoneDateISO: null,
  ...load(),
  setWeeklyGoal: (n) => set(s => {
    const next = { ...s, weeklyGoal: n };
    localStorage.setItem(KEY, JSON.stringify(next)); return next;
  }),
  bumpOnDone: (iso) => set(s => {
    const last = s.lastDoneDateISO ? new Date(s.lastDoneDateISO) : null;
    const now = new Date(iso);
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let streak = s.streakDays;
    if (!last) streak = 1;
    else {
      const diffDays = (day(now) - day(last)) / 86400000;
      streak = diffDays === 1 ? s.streakDays + 1 : diffDays === 0 ? s.streakDays : 1;
    }
    const next = { ...s, streakDays: streak, lastDoneDateISO: iso };
    localStorage.setItem(KEY, JSON.stringify(next)); return next;
  }),
}));