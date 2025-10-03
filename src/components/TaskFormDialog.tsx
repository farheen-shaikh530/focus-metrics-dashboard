import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTasks } from "../store/useTasks";
import type { Priority, Status, Task } from "../types/task";

const PRIOS: Priority[] = ["low", "medium", "high", "urgent"];
const STATI: Status[] = ["todo", "in-progress", "done"];
const PEOPLE = ["Alex", "Sam", "Jordan", "Taylor", "Pat"]; // demo list

export default function TaskFormDialog({
  open,
  onClose,
  task, // when provided, we're editing
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
}) {
  const addTask = useTasks((s) => s.addTask);
  const updateTask = useTasks((s) => s.updateTask);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("todo");
  const [dueDate, setDueDate] = useState<string>("");

 
  const [estimate, setEstimate] = useState<number | undefined>(undefined);

  // Prefill form when opening in edit mode; reset when creating
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate || "");
   
      setEstimate(task.estimateMinutes);
    } else {
      setTitle("");
      setDesc("");
      setPriority("medium");
      setStatus("todo");
      setDueDate("");
    
      setEstimate(undefined);
    }
  }, [task, open]);

  const submit = () => {
    if (!title.trim()) return;

    if (task) {
      updateTask(task.id, {
        title,
        description: desc,
        priority,
        status,
        dueDate: dueDate || undefined,
    
        estimateMinutes: estimate,
      });
    } else {
     addTask({
  title,
  description: desc,
  priority,
  status,
  dueDate: dueDate || undefined,

  estimateMinutes: estimate,
});
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
          <TextField
            label="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            multiline
            minRows={3}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              sx={{ flex: 1 }}
            >
              {PRIOS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              sx={{ flex: 1 }}
            >
              {STATI.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Due date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <Stack direction="row" spacing={2}>
        

            <TextField
              label="Estimate (min)"
              type="number"
              inputProps={{ min: 0, step: 5 }}
              value={estimate ?? ""}
              onChange={(e) =>
                setEstimate(e.target.value ? Number(e.target.value) : undefined)
              }
              sx={{ width: 200 }}
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit}>
          {task ? "Save Changes" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}