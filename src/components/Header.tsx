// src/components/Header.tsx
import {
  AppBar,
  Toolbar,
  Typography,
  Stack,
  Button,
  Tooltip,
  IconButton,
  Avatar,
  Box,
  Chip,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/store/auth";
import { useTasks } from "@/store/useTasks";

export default function Header({
  mode,
  setMode,
}: {
  mode: "light" | "dark";
  setMode: (m: "light" | "dark") => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [hasW2W, setHasW2W] = useState(false);
  const [whyBlocked, setWhyBlocked] = useState<string | null>(null);

  // shared style so all buttons look identical
  const pillBtnSx = useMemo(
    () => ({
      borderColor: "rgba(255,255,255,0.4)",
      color: "#fff",
      textTransform: "none",
      fontWeight: 600,
      borderRadius: 999,
      px: 2.5,
      py: 0.8,
      minHeight: 40,
      "&:hover": {
        bgcolor: "rgba(255,255,255,0.2)",
        borderColor: "rgba(255,255,255,0.7)",
      },
      "&.Mui-disabled": {
        color: "rgba(255,255,255,0.6)",
        borderColor: "rgba(255,255,255,0.25)",
      },
    }),
    []
  );

  // 🔍 Check WhenToWork integration (simple status)
 useEffect(() => {
  const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
  const email = user?.email;
  if (!email) {
    setHasW2W(false);
    setWhyBlocked("Sign in to enable imports.");
    return;
  }
  fetch(`${API}/integrations/status?email=${encodeURIComponent(email)}`)
    .then((r) => r.json())
    .then((d) => {
      setHasW2W(!!d.hasW2W);
      setWhyBlocked(d.hasW2W ? null : d.reason || "Connect WhenToWork to enable imports.");
    })

}, [user]);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: "#a0822a",
          backgroundImage: "url('/header-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#fff",
          boxShadow: "none",
        }}
      >
        <Toolbar
          sx={{
            backdropFilter: "blur(6px)",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            minHeight: 85,
            px: { xs: 2, md: 4 },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* === Left: Home + Title === */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              component={Link}
              to="/"
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}
              aria-label="Home"
            >
              <HomeIcon />
            </IconButton>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  color: "#fff",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                WEEKLY <Box component="span" sx={{ color: "#FFD54F" }}>DASHBOARD</Box>
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}
              >
                Empower your flow — elevate your week
              </Typography>
            </Box>
          </Stack>

          {/* === Center: Nav === */}
          <Stack direction="row" spacing={1.25} alignItems="center">
            {[
              { label: "Productivity", path: "/productivity" },
              { label: "To-Do", path: "/todo" },
              { label: "Calendar", path: "/calendar" },
            ].map((b) => (
              <Button
                key={b.label}
                component={Link}
                to={b.path}
                variant={pathname === b.path ? "contained" : "outlined"}
                color="inherit"
                sx={{
                  ...pillBtnSx,
                  ...(pathname === b.path && {
                    bgcolor: "rgba(255,255,255,0.22)",
                    borderColor: "rgba(255,255,255,0.0)",
                  }),
                }}
              >
                {b.label}
              </Button>
            ))}
          </Stack>

          {/* === Right: Actions + Auth === */}
          <Stack direction="row" spacing={1.25} alignItems="center">
            {/* Import button (gated) */}
            <Tooltip
              title={
                hasW2W ? "Import your WhenToWork shifts as tasks"
                       : (whyBlocked || "Connect WhenToWork to enable imports.")
              }
            >
              <span>
                <Button
                  variant="outlined"
                  sx={pillBtnSx}
                  
                  disabled={!hasW2W}
                >
                  Import Shifts → Tasks
                </Button>
              </span>
            </Tooltip>

            {/* New Task */}
            <Button
              variant="outlined"
              sx={pillBtnSx}
              onClick={() => {
                if (!user) { navigate("/login"); return; }
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
              + New Task
            </Button>

            {/* Auth area */}
            {!user ? (
              <Button
                variant="outlined"
                sx={pillBtnSx}
                startIcon={<LoginIcon />}
                onClick={() => navigate("/login")}
              >
                Sign in
              </Button>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title={user.name || user.email}>
                  <Avatar
                    src={user.picture}
                    alt={user.name}
                    sx={{
                      width: 36,
                      height: 36,
                      border: "2px solid rgba(255,255,255,0.4)",
                    }}
                  />
                </Tooltip>
                <Tooltip title="Sign out">
                  <IconButton color="inherit" onClick={logout} aria-label="Sign out">
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>
        </Toolbar>

        {/* (Optional) show reason banner if blocked */}
        {!hasW2W && whyBlocked && (
          <Box sx={{ px: { xs: 2, md: 4 }, pb: 1 }}>
            <Chip
              label={whyBlocked}
              variant="outlined"
              sx={{
                borderColor: "rgba(255,255,255,0.5)",
                color: "#fff",
                backdropFilter: "blur(4px)",
                bgcolor: "rgba(0,0,0,0.15)",
              }}
            />
          </Box>
        )}
      </AppBar>

      {/* Spacer so content isn’t under the AppBar */}
      <Toolbar />
    </>
  );
}