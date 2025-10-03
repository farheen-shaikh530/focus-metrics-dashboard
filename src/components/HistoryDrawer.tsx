// src/components/HistoryDrawer.tsx
import {
  Drawer, Box, Stack, Typography, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useTasks } from "@/store/useTasks";

type Props = { open: boolean; onClose: () => void };

export default function HistoryDrawer({ open, onClose }: Props) {
  const history = useTasks((s) => s.history);
  const tasks   = useTasks((s) => s.tasks);

  // Pick only completions and shape rows: { id, title, at }
  const rows = useMemo(() => {
    const list = history
    .filter((h) => {
      if (h.type === "move" && h.payload?.to === "done") return true;
      if (h.type === "update" && h.payload?.patch?.status === "done") return true;
      return false;
    })

   
      .map((h) => {
        // try to find a sensible title
        const fromTasks = tasks.find((t) => t.id === h.taskId)?.title;
        const fromSnapshot = h.payload?.snapshot?.title;
        const fromBefore = h.payload?.before?.title;
        const title = fromTasks || fromSnapshot || fromBefore || "(untitled task)";
        return { id: h.id, title, at: h.at };
        
      });
       list.sort((a, b) => +new Date(b.at) - +new Date(a.at));
       return list;

      
  }, [history, tasks]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 420, p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Task History</Typography>
          <IconButton onClick={onClose} aria-label="Close history">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Table size="small" aria-label="Completed tasks history">
          <TableHead>
            <TableRow>
              <TableCell>Task</TableCell>
              <TableCell align="right">Completed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} sx={{ opacity: 0.6, fontStyle: "italic" }}>
                  No completed tasks yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.title}</TableCell>
                  <TableCell align="right">{dayjs(r.at).format("MMM D, YYYY")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    </Drawer>
  );
}
