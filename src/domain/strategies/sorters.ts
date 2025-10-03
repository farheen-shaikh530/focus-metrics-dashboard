import type { Task } from "../../types/task";

export type Sorter = (a: Task, b: Task) => number;

export const byDueThenPrio: Sorter = (a, b) => {
  const da = a.dueDate ? +new Date(a.dueDate) : Infinity;
  const db = b.dueDate ? +new Date(b.dueDate) : Infinity;
  if (da !== db) return da - db;

  const p: Record<Task["priority"], number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return p[a.priority] - p[b.priority];
};