// src/domain/CMD/types.ts
import type { Status } from "../../types/task";
import type { TaskRepository } from "../repositories/taskRepo";

export interface Command {
  do(): void;
  undo(): void;
  label: string;
}

export class MoveTaskCommand implements Command {
  label = "Move task";
  constructor(
    private repo: TaskRepository,
    private id: string,
    private from: Status,
    private to: Status
  ) {}
  do()   { this.repo.update(this.id, { status: this.to }); }
  undo() { this.repo.update(this.id, { status: this.from }); }
}