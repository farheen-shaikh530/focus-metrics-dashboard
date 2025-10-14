import { useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "@mui/material";

import { useTasks } from "@/store/useTasks";
import type { Task } from "@/types/task";
import { useAuth } from "@/store/auth";

type Tab = "active" | "in-progress" | "done";


const pillColors = [
  "rgba(255,64,129,0.18)", 
  "rgba(255,214,0,0.2)",    
  "rgba(142,45,226,0.18)",  
  "rgba(0,184,212,0.18)",   
];

export default function BoardMobile() {
  const { user } = useAuth();
  const userName = (user?.name || user?.email || "there").split(" ")[0];

  const tasks = useTasks((s) => s.tasks);
  const update = useTasks((s) => s.updateTask);
  const remove = useTasks((s) => s.deleteTask);

  const [tab, setTab] = useState<Tab>("active");

  // completion %
  const pct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneCount = tasks.filter((t) => t.status === "done").length;
    return Math.round((doneCount / tasks.length) * 100);
  }, [tasks]);

  // list shown for the selected tab
  const shown = useMemo(() => {
    if (tab === "active") return tasks.filter((t) => t.status === "todo");
    if (tab === "in-progress") return tasks.filter((t) => t.status === "in-progress");
    return tasks.filter((t) => t.status === "done");
  }, [tasks, tab]);

  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === "todo").length,
    [tasks]
  );

  const onToggleDone = (t: Task) =>
    update(t.id, { status: t.status === "done" ? "todo" : "done" });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(131,58,180,.12) 0%, rgba(253,29,29,.10) 50%, rgba(252,176,69,.12) 100%)",
        p: 2,
        pb: 8,
      }}
    >
      {/* Header / Greeting */}
      <Stack spacing={1.2} sx={{ maxWidth: 700, mx: "auto" }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.5, mb: 0.5 }}>
              Hello, {userName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}
            >
              Productivity
            </Typography>
          </Box>

          {/* “Create Task” button (replaces the big + FAB) */}
          <Button
            variant="contained"
            onClick={() => {
              const title = prompt("New task title?");
              if (!title) return;
              useTasks.getState().addTask({
                title,
                description: "",
                priority: "medium",
                status: "todo",
              });
            }}
          >
            Create Task
          </Button>
        </Box>

        <Typography
          variant="h2"
          sx={{
            fontWeight: 900,
            lineHeight: 1.1,
            mt: 1,
            fontFamily: "'Alfa Slab One', cursive",
            background: "linear-gradient(90deg, #8e2de2, #6a11cb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Mission <br /> Control
        </Typography>

        {/* Stats row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
          <Box>
            <Typography sx={{ opacity: 0.7 }}>You have</Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                fontFamily: "'Alfa Slab One', cursive",
                letterSpacing: 1,
                background: "linear-gradient(90deg, #FF4081, #FFD600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "1px 1px 2px rgba(0,0,0,0.15)",
                mb: 1,
              }}
            >
              {activeCount} tasks brewing… better sip ’em before they spill!
            </Typography>
          </Box>

          <Box sx={{ textAlign: "right", minWidth: 160 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Completed
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {pct}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 8,
                backgroundColor: "rgba(0,0,0,.08)",
                "& .MuiLinearProgress-bar": { backgroundColor: "#222" },
              }}
            />
          </Box>
        </Stack>

        {/* Toggle Active / In Progress / Done */}
        <ToggleButtonGroup
          exclusive
          color="primary"
          value={tab}
          onChange={(_, v) => v && setTab(v)}
          sx={{
            alignSelf: "flex-end",
            mt: 1,
            "& .MuiToggleButton-root": {
              borderRadius: 999,
              px: 2.2,
              textTransform: "none",
              fontWeight: 700,
            },
          }}
        >
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="in-progress">In&nbsp;Progress</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>

        {/* === LIST (fallback cards, no TaskPill import) === */}
        <Stack spacing={2.2} sx={{ mt: 2 }}>
          {shown.length === 0 && (
            <Typography sx={{ opacity: 0.6, fontStyle: "italic", px: 0.5 }}>
              Nothing here yet — add a task!
            </Typography>
          )}

          {shown.map((t, i) => (
            <Box
              key={t.id}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: pillColors[i % pillColors.length],
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {t.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  {t.status.replace("-", " ")}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onToggleDone(t)}
                >
                  {t.status === "done" ? "Mark Active" : "Mark Done"}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => remove(t.id)}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
