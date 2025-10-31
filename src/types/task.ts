// src/types/task.ts

export type Priority = "low" | "medium" | "high" | "urgent";
export type Status   = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string;

  estimateMinutes?: number;
  timeSpentMs?: number;
  timerStartedAt?: string | null;

  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;   // <-- used by KPIs
}


/**
 * Optional guard for status moves. If you want to forbid moving out of "done",
 * keep the rule below. If you want to allow it, return true unconditionally.
 */
export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  if (from === "done") return false; // disallow moving away from Done
  return true;
}