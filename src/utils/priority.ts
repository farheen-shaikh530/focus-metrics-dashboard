import dayjs from "dayjs";
import type { Task } from "@/types/task";

export function scoreTask(t: Task): number {
  let s = 0;
  if (t.status === "todo") s += 2;
  if (t.status === "in-progress") s += 3;

  // due date urgency
  if (t.dueDate) {
    const days = dayjs(t.dueDate).diff(dayjs(), "day");
    if (days <= 0) s += 6;           // overdue
    else if (days <= 2) s += 4;
    else if (days <= 5) s += 2;
  }

  // shorter tasks first (if estimate present)
  if (t.estimateMinutes) {
    if (t.estimateMinutes <= 25) s += 2;
    else if (t.estimateMinutes <= 60) s += 1;
  }

  // older tasks get a bump
  const ageDays = dayjs().diff(dayjs(t.createdAt), "day");
  s += Math.min(3, Math.floor(ageDays / 2));

  return s;
}

export function topSuggestions(tasks: Task[], k = 3) {
  return tasks
    .filter(t => t.status !== "done")
    .map(t => ({ t, score: scoreTask(t) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, k)
    .map(x => x.t);
}