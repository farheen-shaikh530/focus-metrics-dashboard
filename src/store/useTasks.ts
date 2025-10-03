// src/store/useTasks.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import type { Task, Status } from "../types/task";
import { loadTasks, saveTasks } from "../utils/storage";

dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);

/** History entry (avoid global name 'History' to not clash with DOM History) */
export type TaskHistory = {
  id: string;
  taskId: string;
  type: "create" | "update" | "move" | "delete";
  at: string;               // ISO timestamp
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

  /** Snapshot “per user”. Since this app is single-user, we return a single “Me” bucket. */
  getAssigneeStats: () => Array<{
    assignee: string;           // "Me"
    completed: number;
    inProgress: number;
    totalTimeMs: number;
    avgCycleTimeMs: number;     // avg createdAt->done (ms)
    throughputThisWeek: number; // done items this ISO week
  }>;
};

export type TaskStore = State & Actions;

const nowISO = () => new Date().toISOString();

const persist = (s: State) => {
  saveTasks({ tasks: s.tasks, history: s.history });
};

export const useTasks = create<TaskStore>()(
  immer((set, get) => ({
    tasks: [],
    hydrated: false,
    history: [],

    // ---------- hydration ----------
    hydrate: async () => {
      if (get().hydrated) return;

      // Try backend first
      const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
      try {
        const res = await fetch(`${API}/tasks`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = (await res.json()) as unknown;

        // Trust an array of Task-like objects; otherwise fallback below
        if (Array.isArray(data)) {
          set((s) => {
            s.tasks = data as Task[];
            s.hydrated = true;
            // keep existing local history until backend also serves it
            s.history = s.history ?? [];
          });
          return;
        }
        throw new Error("Unexpected API payload");
      } catch (e) {
        // Fallback to localStorage if API is not reachable
        console.warn("API unavailable, using local storage:", e);
        const local = loadTasks<{ tasks: Task[]; history?: TaskHistory[] }>({
          tasks: [],
          history: [],
        });
        set((s) => {
          s.tasks = local.tasks || [];
          s.history = local.history || [];
          s.hydrated = true;
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
        persist(s);
      }),

    updateTask: (id, patch) =>
      set((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;
        const before = { ...t };
        Object.assign(t, patch);
        t.updatedAt = nowISO();
        s.history.unshift({
          id: nanoid(),
          taskId: id,
          type: "update",
          at: t.updatedAt,
          payload: { patch, before },
        });
        persist(s);
      }),

    moveTask: (id, nextStatus, index) =>
      set((s) => {
        const i = s.tasks.findIndex((t) => t.id === id);
        if (i < 0) return;
        const [t] = s.tasks.splice(i, 1);
        const from = t.status;
        t.status = nextStatus;
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
          s.history.unshift({
            id: nanoid(),
            taskId: id,
            type: "move",
            at: nowISO(),
            payload: { from, to: "done" },
          });
        }

        t.updatedAt = nowISO();
        persist(s);
      }),

    // ---------- analytics ----------
    getWeeklyDoneCounts: (weeks) => {
      const start = dayjs().subtract(weeks - 1, "week").startOf("isoWeek");
      const bucket = new Map<string, number>();
      for (let i = 0; i < weeks; i++) {
        const wk = start.add(i, "week").startOf("isoWeek").format("YYYY-MM-DD");
        bucket.set(wk, 0);
      }
      get().tasks.forEach((t) => {
        if (t.status !== "done") return;
        const wk = dayjs(t.updatedAt).startOf("isoWeek").format("YYYY-MM-DD");
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
        const wk = dayjs(t.updatedAt).startOf("isoWeek").format("YYYY-MM-DD");
        if (!bucket.has(wk)) return;
        const cycle = dayjs(t.updatedAt).diff(dayjs(t.createdAt));
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
        const wk = dayjs(t.updatedAt).startOf("isoWeek").format("YYYY-MM-DD");
        if (!bucket.has(wk)) return;
        const cell = bucket.get(wk)!;
        cell.total += 1;

        // On-time if no dueDate OR completed <= dueDate
        if (!t.dueDate || dayjs(t.updatedAt).isSameOrBefore(dayjs(t.dueDate))) {
          cell.ontime += 1;
        }
      });

      return Array.from(bucket, ([weekStart, v]) => ({
        weekStart,
        onTimePct: v.total ? Math.round((v.ontime / v.total) * 100) : 0,
      }));
    },

    getAssigneeStats: () => {
      // Single-user snapshot
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
          const cycle = dayjs(t.updatedAt).diff(dayjs(t.createdAt));
          if (cycle > 0) cycleTimes.push(cycle);
          if (dayjs(t.updatedAt).isAfter(weekStart)) throughputThisWeek++;
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