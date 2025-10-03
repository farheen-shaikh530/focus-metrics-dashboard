

export type Priority = "low" | "medium" | "high" | "urgent";
export type Status   = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string;

  // Tracking fields
  estimateMinutes?: number;
  timeSpentMs?: number;
  timerStartedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  if (from === "done") return false;   // disallow moving away from Done
  return true;                         // allow all others
}