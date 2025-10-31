// src/store/useTasks.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import type { Task, Status } from "@/types/task";
import { loadTasks, saveTasks } from "@/utils/storage";
import { useGoals } from "@/store/goals";


dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);


/** History entry */
export type TaskHistory = {
  id: string;
  taskId: string;
  type: "create" | "update" | "move" | "delete";
  at: string; // ISO timestamp
  payload?: any;
};

type State = {
  tasks: Task[];
  hydrated: boolean;
  history: TaskHistory[];
};

type Actions = {
  /** Hydrate from FastAPI if available, otherwise from localStorage */
  hydrate: () => Promise<void>;

  addTask: (partial: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (id: string, nextStatus: Status, index?: number) => void;
  deleteTask: (id: string) => void;

  // timers
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  stopTimerAndOptionallyComplete: (id: string, markDone?: boolean) => void;

  // analytics
  getWeeklyDoneCounts: (weeks: number) => { weekStart: string; count: number }[];
  getWeeklyCycleTime: (weeks: number) => { weekStart: string; avgCycleMs: number }[];
  getWeeklyOnTimeRate: (weeks: number) => { weekStart: string; onTimePct: number }[];

  /** Single-user snapshot (“Me”) */
  getAssigneeStats: () => Array<{
    assignee: string;
    completed: number;
    inProgress: number;
    totalTimeMs: number;
    avgCycleTimeMs: number;
    throughputThisWeek: number;
  }>;
};

export type TaskStore = State & Actions;

// ──────────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────────
const nowISO = () => new Date().toISOString();

/** force new array ref so selectors depending on `tasks` re-run */
const touchList = (s: State) => {
  s.tasks = [...s.tasks];
};

const persist = (s: State) => {
  saveTasks({ tasks: s.tasks, history: s.history });
};

/** completion timestamp used by KPIs */
const completedWhen = (t: Task) =>
  new Date(((t as any).completedAt as string | undefined) ?? t.updatedAt);

// ──────────────────────────────────────────────────────────────────────────────
// store
// ──────────────────────────────────────────────────────────────────────────────
export const useTasks = create<TaskStore>()(
  immer((set, get) => ({
    tasks: [],
    hydrated: false,
    history: [],

    // ---------- hydration ----------
    hydrate: async () => {
      if (get().hydrated) return;

      const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
      try {
        const res = await fetch(`${API}/tasks`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = (await res.json()) as unknown;

        if (Array.isArray(data)) {
          set((s) => {
            s.tasks = data as Task[];
            // backfill completedAt for already-done tasks
            s.tasks.forEach((t: any) => {
              if (t.status === "done" && !t.completedAt) t.completedAt = t.updatedAt ?? nowISO();
            });
            s.hydrated = true;
          });
          return;
        }
        throw new Error("Unexpected /tasks payload");
     } catch (e) {
      console.warn("API unavailable, using local storage:", e);
      const local = loadTasks<{ tasks: Task[]; history?: TaskHistory[] }>({
        tasks: [],
        history: [],
      });

      set((s) => {
        s.tasks   = local.tasks || [];           // <-- add
        s.history = local.history || [];         // <-- add
        s.hydrated = true;                       // <-- add

        // backfill completedAt for done items
        s.tasks.forEach((t) => {
          if (t.status === "done" && !t.completedAt) {
            t.completedAt = t.updatedAt || new Date().toISOString();
          }
        });
      });
}

    },

    // ---------- CRUD ----------
    addTask: (partial) =>
      set((s) => {
        const ts = nowISO();
        const task: Task = {
          id: nanoid(),
          createdAt: ts,
          updatedAt: ts,
          timeSpentMs: partial.timeSpentMs ?? 0,
          timerStartedAt: null,
          ...partial,
        };
        s.tasks.unshift(task);
        s.history.unshift({
          id: nanoid(),
          taskId: task.id,
          type: "create",
          at: ts,
          payload: { ...partial },
        });
        touchList(s);
        persist(s);
      }),

    updateTask: (id, patch) =>
      set((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;

        const before = { ...t };
        const wasDone = t.status === "done";

        Object.assign(t, patch);

        // became done ► set completedAt once
        if (t.status === "done" && !wasDone && !(t as any).completedAt) {
          (t as any).completedAt = nowISO();
          try {
            useGoals.getState().bumpOnDone?.((t as any).completedAt);
          } catch {}
        }

        t.updatedAt = nowISO();
        s.history.unshift({
          id: nanoid(),
          taskId: id,
          type: "update",
          at: t.updatedAt,
          payload: { patch, before },
        });
        touchList(s);
        persist(s);
      }),

    moveTask: (id, nextStatus, index) =>
      set((s) => {
        const i = s.tasks.findIndex((t) => t.id === id);
        if (i < 0) return;

        const [t] = s.tasks.splice(i, 1);
        const from = t.status;
        t.status = nextStatus;

       if (nextStatus === "done" && !t.completedAt) {
  t.completedAt = new Date().toISOString();
}


        t.updatedAt = nowISO();
        if (index === undefined) s.tasks.unshift(t);
        else s.tasks.splice(index, 0, t);

        s.history.unshift({
          id: nanoid(),
          taskId: id,
          type: "move",
          at: t.updatedAt,
          payload: { from, to: nextStatus },
        });
        touchList(s);
        persist(s);
      }),

    deleteTask: (id) =>
      set((s) => {
        const snapshot = s.tasks.find((x) => x.id === id);
        s.tasks = s.tasks.filter((t) => t.id !== id);
        s.history.unshift({
          id: nanoid(),
          taskId: id,
          type: "delete",
          at: nowISO(),
          payload: { snapshot },
        });
        touchList(s);
        persist(s);
      }),

    // ---------- timers ----------
    startTimer: (id) =>
      set((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t || t.timerStartedAt) return;
        t.timerStartedAt = nowISO();
        t.updatedAt = t.timerStartedAt;
        s.history.unshift({
          id: nanoid(),
          taskId: id,
          type: "update",
          at: t.updatedAt,
          payload: { timer: "start" },
        });
        touchList(s);
        persist(s);
      }),

    pauseTimer: (id) =>
      set((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t || !t.timerStartedAt) return;
        const started = new Date(t.timerStartedAt).getTime();
        const add = Math.max(0, Date.now() - started);
        t.timeSpentMs = (t.timeSpentMs || 0) + add;
        t.timerStartedAt = null;
        t.updatedAt = nowISO();
        s.history.unshift({
          id: nanoid(),
          taskId: id,
          type: "update",
          at: t.updatedAt,
          payload: { timer: "pause", addMs: add },
        });
        touchList(s);
        persist(s);
      }),

    stopTimerAndOptionallyComplete: (id, markDone = false) =>
      set((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;

        if (t.timerStartedAt) {
          const started = new Date(t.timerStartedAt).getTime();
          const add = Math.max(0, Date.now() - started);
          t.timeSpentMs = (t.timeSpentMs || 0) + add;
          t.timerStartedAt = null;
        }

        if (markDone && t.status !== "done") {
          const from = t.status;
          t.status = "done";
          if (!(t as any).completedAt) (t as any).completedAt = nowISO();
          s.history.unshift({
            id: nanoid(),
            taskId: id,
            type: "move",
            at: nowISO(),
            payload: { from, to: "done" },
          });
          try {
            useGoals.getState().bumpOnDone?.((t as any).completedAt);
          } catch {}
        }

        t.updatedAt = nowISO();
        touchList(s);
        persist(s);
      }),

    // ---------- analytics (all use completedAt ?? updatedAt) ----------
    getWeeklyDoneCounts: (weeks) => {
      const start = dayjs().subtract(weeks - 1, "week").startOf("isoWeek");
      const bucket = new Map<string, number>();
      for (let i = 0; i < weeks; i++) {
        const wk = start.add(i, "week").startOf("isoWeek").format("YYYY-MM-DD");
        bucket.set(wk, 0);
      }
      get().tasks.forEach((t) => {
        if (t.status !== "done") return;
        const wk = dayjs(completedWhen(t)).startOf("isoWeek").format("YYYY-MM-DD");
        if (bucket.has(wk)) bucket.set(wk, (bucket.get(wk) || 0) + 1);
      });
      return Array.from(bucket, ([weekStart, count]) => ({ weekStart, count }));
    },

    getWeeklyCycleTime: (weeks) => {
      const start = dayjs().subtract(weeks - 1, "week").startOf("isoWeek");
      const bucket = new Map<string, number[]>();
      for (let i = 0; i < weeks; i++) {
        const wk = start.add(i, "week").startOf("isoWeek").format("YYYY-MM-DD");
        bucket.set(wk, []);
      }
      get().tasks.forEach((t) => {
        if (t.status !== "done") return;
        const wk = dayjs(completedWhen(t)).startOf("isoWeek").format("YYYY-MM-DD");
        if (!bucket.has(wk)) return;
        const cycle = dayjs(completedWhen(t)).diff(dayjs(t.createdAt));
        if (cycle > 0) bucket.get(wk)!.push(cycle);
      });
      return Array.from(bucket, ([weekStart, arr]) => ({
        weekStart,
        avgCycleMs: arr.length
          ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
          : 0,
      }));
    },

    getWeeklyOnTimeRate: (weeks) => {
      const start = dayjs().subtract(weeks - 1, "week").startOf("isoWeek");
      const bucket = new Map<string, { ontime: number; total: number }>();
      for (let i = 0; i < weeks; i++) {
        const wk = start.add(i, "week").startOf("isoWeek").format("YYYY-MM-DD");
        bucket.set(wk, { ontime: 0, total: 0 });
      }

      get().tasks.forEach((t) => {
        if (t.status !== "done") return;
        const wk = dayjs(completedWhen(t)).startOf("isoWeek").format("YYYY-MM-DD");
        if (!bucket.has(wk)) return;
        const cell = bucket.get(wk)!;
        cell.total += 1;

        // On-time if no dueDate OR completed <= dueDate
        if (!t.dueDate || dayjs(completedWhen(t)).isSameOrBefore(dayjs(t.dueDate))) {
          cell.ontime += 1;
        }
      });

      return Array.from(bucket, ([weekStart, v]) => ({
        weekStart,
        onTimePct: v.total ? Math.round((v.ontime / v.total) * 100) : 0,
      }));
    },

    getAssigneeStats: () => {
      const tasks = get().tasks;
      const weekStart = dayjs().startOf("isoWeek");
      let completed = 0;
      let inProgress = 0;
      let totalTimeMs = 0;
      const cycleTimes: number[] = [];
      let throughputThisWeek = 0;

      tasks.forEach((t) => {
        if (t.status === "done") completed++;
        if (t.status === "in-progress") inProgress++;
        totalTimeMs += t.timeSpentMs || 0;

        if (t.status === "done") {
          const cycle = dayjs(completedWhen(t)).diff(dayjs(t.createdAt));
          if (cycle > 0) cycleTimes.push(cycle);
          if (dayjs(completedWhen(t)).isAfter(weekStart)) throughputThisWeek++;
        }
      });

      const avgCycleTimeMs = cycleTimes.length
        ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
        : 0;

      return [
        {
          assignee: "Me",
          completed,
          inProgress,
          totalTimeMs,
          avgCycleTimeMs,
          throughputThisWeek,
        },
      ];
    },
  }))
);