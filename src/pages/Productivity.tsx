import { Box, Typography, Button, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTasks } from "../store/useTasks";
import { useMemo, useState } from "react";
import { useAuth } from "@/store/auth";

const { user } = useAuth();
const firstName = (user?.name || user?.email || "there").split(" ")[0];


export default function Productivity() {
  const tasks = useTasks((s) => s.tasks);
  const [filter, setFilter] = useState<"active" | "done">("active");

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);

  const completedPercent = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* 🔹 Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -2,
        }}
      >
        <source src="/videos/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* 🔹 Dark overlay for readability */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "rgba(0,0,0,0.5)",
          zIndex: -1,
        }}
      />

      {/* 🔹 Foreground content */}
      <Box sx={{ p: 6, color: "#fff" }}>
    <Typography variant="h4" fontWeight={800}>
  Hello, {firstName}
</Typography>

        <Typography variant="h5" sx={{ opacity: 0.8, mb: 4 }}>
          Lazy Coffee
        </Typography>

        <Typography variant="h6">
          You have <b>{filter === "active" ? activeTasks.length : doneTasks.length}</b>{" "}
          {filter === "active" ? "active tasks" : "completed tasks"}
        </Typography>

        <Typography variant="body1" sx={{ mt: 2 }}>
          Completed: {completedPercent}%
        </Typography>

        {/* Active / Done toggle */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
          >
            <ToggleButton value="active" sx={{ color: "#fff" }}>
              Active
            </ToggleButton>
            <ToggleButton value="done" sx={{ color: "#fff" }}>
              Done
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>
    </Box>
  );
}