import { Typography, Stack } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "../types/task";
import TaskCard from "./TaskCard";
import { motion } from "framer-motion";
import SortableTask from "./SortableTask";
import { memo } from "react";

function ColumnInner({ id, title, tasks }: { id: string; title: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 16 }}
      style={{ minWidth: 320, flex: 1 }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
        {title} • {tasks.length}
      </Typography>

      <Stack
        ref={setNodeRef}
        component="ul" 
        role="list"
        spacing={1.25}
        sx={{
          p: 1,
          minHeight: 120,                      // ✅ allow dropping into empty column
          borderRadius: 2,
          outline: isOver ? "2px dashed" : "1px solid",
          outlineColor: isOver ? "primary.main" : "divider",
          bgcolor: isOver ? "action.hover" : "transparent",
          transition: "background-color .15s ease, box-shadow .15s ease, outline-color .15s ease",
          boxShadow: isOver ? 3 : 0,
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && (
            <Typography variant="body2" sx={{ p: 1, fontStyle: "italic", opacity: 0.7 }}>
              No tasks here yet — drag one in or click “New Task”.
            </Typography>
          )}

          {tasks.map((t) => (
           <SortableTask key={t.id} id={t.id} role="listitem">
  <TaskCard task={t} />
</SortableTask>

          ))}
        </SortableContext>
      </Stack>
    </motion.div>
  );
}

export default memo(ColumnInner);
