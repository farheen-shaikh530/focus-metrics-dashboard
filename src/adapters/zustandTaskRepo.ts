import { useTasks } from "../store/useTasks";
import type { TaskRepository } from "../domain/repositories/taskRepo";
import type { Status, Task } from "../types/task";

/** Adapter implementing the repository using your Zustand store */
export const zustandTaskRepo: TaskRepository = {
  get(id: string): Task | undefined {
    return useTasks.getState().tasks.find(t => t.id === id);
  },
  update(id: string, patch: Partial<Task>) {
    useTasks.getState().updateTask(id, patch);
  },
  move(id: string, to: Status) {
    useTasks.getState().moveTask(id, to);
  },
};