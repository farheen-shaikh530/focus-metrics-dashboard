// src/pages/KanbanBoard.tsx
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Grid from "@mui/material/Grid";
import Column from "../components/Column";
import { useTasks } from "../store/useTasks";
import { MoveTaskCommand } from "@/domain/CMD/types";
import { zustandTaskRepo } from "@/adapters/zustandTaskRepo";
import type { Status } from "@/types/task";


function onMove(id: string, from: Status, to: Status) {
  const cmd = new MoveTaskCommand(zustandTaskRepo, id, from, to);
  cmd.do();
}

export default function KanbanBoard() {
  const hydrate = useTasks((s) => s.hydrate);
  const tasks   = useTasks((s) => s.tasks);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Group tasks by status (memoized)
  const byStatus = useMemo(
    () => ({
      todo:       tasks.filter((t) => t.status === "todo"),
      inprogress: tasks.filter((t) => t.status === "in-progress"),
      done:       tasks.filter((t) => t.status === "done"),
    }),
    [tasks]
  );

  // Helper: map a column id to a Status
  const asStatus = (colId: string): Status =>
    colId === "todo" ? "todo" : colId === "in-progress" ? "in-progress" : "done";

  // Use Command to move a task (do/undo-friendly)
  function onMove(id: string, from: Status, to: Status) {
    const cmd = new MoveTaskCommand(zustandTaskRepo, id, from, to);
    cmd.do();
    // TODO: push cmd to your undo stack if you add one
  }

  // dnd-kit drag end handler
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const from = task.status;
    const to = asStatus(String(overId));

    if (from !== to) {
      onMove(id, from, to);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[snapCenterToCursor]}
      onDragEnd={onDragEnd}
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
      >
        <Grid container spacing={2} sx={{ p: 2, mb: 4 }}>
         <Grid size={6}>
            <Column id="todo" title="To Do" tasks={byStatus.todo} />
          </Grid>
         <Grid size={6}>
            <Column id="in-progress" title="In Progress" tasks={byStatus.inprogress} />
          </Grid>
         <Grid size={6}>
            <Column id="done" title="Done" tasks={byStatus.done} />
          </Grid>
        </Grid>
      </motion.div>
    </DndContext>
  );
}