import type { Task, Status } from "../../types/task";

export interface TaskRepository {
  get(id: string): Task | undefined;
  update(id: string, patch: Partial<Task>): void;
  move(id: string, to: Status): void;
}