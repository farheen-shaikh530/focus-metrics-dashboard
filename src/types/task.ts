// src/types/task.ts

export type Priority = "low" | "medium" | "high" | "urgent";
export type Status   = "todo" | "in-progress" | "done";

export type Task = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;

  // Dates
  createdAt: string;              // when the task was created
  updatedAt: string;              // last update (any change)
  dueDate?: string;               // optional deadline (ISO)
  completedAt?: string | null;    // ⬅️ stamp when it first reaches "done"

  // Tracking
  estimateMinutes?: number;
  timeSpentMs?: number;
  timerStartedAt?: string | null;
};

/**
 * Optional guard for status moves. If you want to forbid moving out of "done",
 * keep the rule below. If you want to allow it, return true unconditionally.
 */
export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  if (from === "done") return false; // disallow moving away from Done
  return true;
}