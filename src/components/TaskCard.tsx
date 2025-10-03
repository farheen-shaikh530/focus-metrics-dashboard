import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Stack,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import CheckIcon from "@mui/icons-material/Check";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";

import type { Task } from "../types/task";
import { useTasks } from "../store/useTasks";
import { isDueSoon, isOverdue } from "../utils/date";
import TaskFormDialog from "./TaskFormDialog";

export default function TaskCard({ task }: { task: Task }) {
  const { enqueueSnackbar } = useSnackbar();

  const del = useTasks((s) => s.deleteTask);
  const start = useTasks((s) => s.startTimer);
  const pause = useTasks((s) => s.pauseTimer);
  const stopDone = useTasks((s) => s.stopTimerAndOptionallyComplete);

  const [editing, setEditing] = useState(false);

  // live elapsed display while the timer is running
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!task.timerStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [task.timerStartedAt]);

  const elapsedMs =
    (task.timeSpentMs || 0) +
    (task.timerStartedAt
      ? Date.now() - new Date(task.timerStartedAt).getTime()
      : 0);

  const h = Math.floor(elapsedMs / 3_600_000);
  const m = Math.floor((elapsedMs % 3_600_000) / 60_000);
  const s = Math.floor((elapsedMs % 60_000) / 1_000);

  const overdue = isOverdue(task.dueDate);
  const soon = isDueSoon(task.dueDate);

  return (
    <motion.div layout whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.995 }}>
      <Card
        variant="outlined"
        sx={{
          borderColor: overdue ? "error.main" : soon ? "warning.main" : "divider",
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            {task.title}
          </Typography>

          {task.description && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {task.description}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
            {/* priority */}
            <Chip
              size="small"
              label={task.priority}
              color={
                task.priority === "urgent"
                  ? "error"
                  : task.priority === "high"
                  ? "warning"
                  : task.priority === "medium"
                  ? "info"
                  : "default"
              }
            />
            {/* due date */}
            {task.dueDate && (
              <Chip
                size="small"
                label={`Due: ${task.dueDate}`}
                variant={overdue ? "filled" : "outlined"}
                color={overdue ? "error" : soon ? "warning" : "default"}
              />
            )}
            {/* time tracking */}
            <Chip size="small" label={`Time: ${h}h ${m}m ${s}s`} />
            {/* assignee + estimate */}
           
            {task.estimateMinutes !== undefined && (
              <Chip size="small" label={`Est: ${task.estimateMinutes}m`} />
            )}
          </Stack>
        </CardContent>

        <CardActions sx={{ justifyContent: "space-between" }}>
          {/* left: timer & complete */}
          <Stack direction="row" spacing={1}>
            {!task.timerStartedAt ? (
              <IconButton onClick={() => start(task.id)} aria-label="start timer">
                <PlayArrowIcon />
              </IconButton>
            ) : (
              <IconButton onClick={() => pause(task.id)} aria-label="pause timer">
                <PauseIcon />
              </IconButton>
            )}
            <IconButton
              onClick={() => stopDone(task.id, true)}
              aria-label="complete task"
            >
              <CheckIcon />
            </IconButton>
          </Stack>

          {/* right: edit & delete */}
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => setEditing(true)} aria-label="edit task">
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                del(task.id);
                enqueueSnackbar("Task deleted", { variant: "info" });
              }}
              aria-label="delete task"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </CardActions>
      </Card>

      {/* Edit dialog */}
      <TaskFormDialog open={editing} onClose={() => setEditing(false)} task={task} />
    </motion.div>
  );
}