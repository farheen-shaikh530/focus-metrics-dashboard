// src/components/Header.tsx
import {
  AppBar,
  Toolbar,
  Typography,
  Stack,
  Button,
  Switch,
  Tooltip,
  IconButton,
  Box,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";

import HistoryDrawer from "./HistoryDrawer";
import TaskFormDialog from "./TaskFormDialog";
import { useAuth } from "@/store/auth";
import { useTasks } from "@/store/useTasks";

export default function Header({
  mode,
  setMode,
}: {
  mode: "light" | "dark";
  setMode: (m: "light" | "dark") => void;
}) {
  
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);            // new task dialog
  const [showHistory, setShowHistory] = useState(false); // history drawer

  return (
    <>
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: "#FF4081", color: "#fff" }}>
        <Toolbar sx={{ gap: 5, minHeight: 100 }}>
          {/* Title + subtitle */}
          <Box sx={{ flexGrow: 1, lineHeight: 1 }}>
            <Typography variant="h6" sx={{ fontFamily: "'Alfa Slab One', cursive", letterSpacing: 1 }}>
              Stay focused, make it happen!
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "0.8rem", fontStyle: "italic" }}>
              Work in Motion — tasks and progress, always moving
            </Typography>
          </Box>

          {/* Nav */}
          <Stack direction="row" spacing={1} sx={{ mr: 1 }}>
            <Button
              component={Link}
              to="/"
              color="inherit"
              variant={pathname === "/" ? "contained" : "text"}
              sx={pathname === "/" ? { bgcolor: "rgba(255,255,255,0.18)" } : undefined}
              size="small"
            >
              Productivity
            </Button>
            <Button
              component={Link}
              to="/todo"
              color="inherit"
              variant={pathname === "/todo" ? "contained" : "text"}
              sx={pathname === "/todo" ? { bgcolor: "rgba(255,255,255,0.18)" } : undefined}
              size="small"
            >
              Todo
            </Button>
            <Button
              component={Link}
              to="/calendar"
              color="inherit"
              variant={pathname === "/calendar" ? "contained" : "text"}
              sx={pathname === "/calendar" ? { bgcolor: "rgba(255,255,255,0.18)" } : undefined}
              size="small"
            >
              Calendar
            </Button>
          </Stack>

          {/* Dark mode */}
          <Tooltip title="Toggle dark mode">
            <Switch
              checked={mode === "dark"}
              onChange={(e) => setMode(e.target.checked ? "dark" : "light")}
              inputProps={{ "aria-label": "Dark mode" }}
            />
          </Tooltip>

          {/* History */}
          <Tooltip title="Task history">
            <IconButton color="inherit" onClick={() => setShowHistory(true)} aria-label="Open history">
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          {/* New Task */}
        <Button
  color="inherit"
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
  New Task
</Button>


          {/* Current user + Logout */}
          {user && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {user.name || user.email}
              </Typography>
              <Tooltip title="Sign out">
                <IconButton color="inherit" onClick={logout} aria-label="Logout">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* Spacer so content isn’t under the AppBar */}
      <Toolbar />

      {/* Drawers / Dialogs */}
      <HistoryDrawer open={showHistory} onClose={() => setShowHistory(false)} />
      <TaskFormDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}