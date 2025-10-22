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
console.log("API_URL", import.meta.env.VITE_API_URL);
console.log("GOOGLE_CLIENT_ID", import.meta.env.VITE_GOOGLE_CLIENT_ID); 

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


 // ---- integration status ----
  const [hasW2W, setHasW2W]   = useState(false);
  const [hasGCal, setHasGCal] = useState(false);
  const [whyW2W, setWhyW2W]   = useState<string | null>(null);
  const [whyGCal, setWhyGCal] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";


  // Check integrations
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
    const email = user?.email;


    if (!email) {
    setHasW2W(false);
    setHasGCal(false);
    setWhyW2W("Sign in to enable WhenToWork import");
    setWhyGCal("Sign in to enable Google Calendar import");
    return;
  }

 fetch(`${API}/integrations/status?email=${encodeURIComponent(email)}`)
    .then((r) => r.json())
    .then((d) => {
      setHasW2W(!!d.hasW2W);
      setWhyW2W(d.w2wReason ?? null);

      setHasGCal(!!d.hasGCal);
      setWhyGCal(d.gcalReason ?? null);
    })

    .catch(() => {
      setHasW2W(false);
      setHasGCal(false);
      
    });
}, [user]);

  // Import handlers
  const importFromWhenToWork = async () => {
    const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
    if (!user) return navigate("/login");
    if (!hasW2W) return;
    const res = await fetch(`${API}/w2w/sync-to-tasks`, { method: "POST" });
    const data = await res.json();
    alert(`WhenToWork → Tasks\nCreated: ${data.created}\nUpdated: ${data.updated}`);
  };

  const importFromGoogleCalendar = async () => {
    const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
    if (!user) return navigate("/login");
    if (!hasGCal) return;
    const res = await fetch(`${API}/gcal/sync-to-tasks`, { method: "POST" });
    const data = await res.json();
    alert(`Google Calendar → Tasks\nCreated: ${data.created}\nUpdated: ${data.updated}`);
  };

    const pillBtnSx = useMemo(() => ({
    borderColor: "rgba(255,255,255,0.4)",
    color: "#fff",
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 999,
    px: 2.5,
    py: 0.8,
    minHeight: 40,
    "&:hover": { bgcolor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.7)" },
    "&.Mui-disabled": { color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.25)" },
  }), []);

 return (
    <>
      <AppBar position="fixed" elevation={0}
        sx={{
          backgroundColor: "#a0822a",
          backgroundImage: "url('/header-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#fff", boxShadow: "none",
        }}>
        <Toolbar sx={{
          backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,.3)",
          minHeight: 85, px: { xs: 2, md: 4 }, gap: 2,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {/* Left: home + title */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton component={Link} to="/" sx={{ color: "white", bgcolor: "rgba(255,255,255,.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,.25)" }}} aria-label="Home">
              <HomeIcon />
            </IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: .5, fontFamily: "'Poppins',sans-serif" }}>
                WEEKLY <Box component="span" sx={{ color: "#FFD54F" }}>DASHBOARD</Box>
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: "italic", color: "rgba(255,255,255,.85)" }}>
                Empower your flow — elevate your week
              </Typography>
            </Box>
          </Stack>

          {/* Center nav */}
          <Stack direction="row" spacing={1.25}>
            {[
              { label: "Productivity", path: "/productivity" },
              { label: "To-Do",        path: "/todo" },
              { label: "Calendar",     path: "/calendar" },
            ].map(b => (
              <Button key={b.path} component={Link} to={b.path}
                variant={pathname === b.path ? "contained" : "outlined"} color="inherit"
                sx={{ ...pillBtnSx, ...(pathname === b.path && { bgcolor: "rgba(255,255,255,.22)", borderColor: "transparent" }) }}>
                {b.label}
              </Button>
            ))}
          </Stack>

          {/* Right actions */}
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Tooltip title={hasGCal ? "Import from your Google Calendar" : (whyGCal || "")}>
              <span>
                <Button variant="outlined" sx={pillBtnSx} disabled={!hasGCal} onClick={importFromGoogleCalendar}>
                  Import from Google Calendar
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={hasW2W ? "Import WhenToWork shifts" : (whyW2W || "")}>
              <span>
                <Button variant="outlined" sx={pillBtnSx} disabled={!hasW2W} onClick={importFromWhenToWork}>
                  Import from WhenToWork
                </Button>
              </span>
            </Tooltip>

            <Button variant="outlined" sx={pillBtnSx}
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                const title = prompt("New task title?"); if (!title) return;
                useTasks.getState().addTask({ title, description: "", priority: "medium", status: "todo" });
              }}>
              + New Task
            </Button>

            {!user ? (
              <Button variant="outlined" sx={pillBtnSx} startIcon={<LoginIcon />} onClick={() => navigate("/login")}>
                Sign in
              </Button>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title={user.name || user.email}>
                  <Avatar src={user.picture} alt={user.name} sx={{ width: 36, height: 36, border: "2px solid rgba(255,255,255,.4)" }} />
                </Tooltip>
                <Tooltip title="Sign out">
                  <IconButton color="inherit" onClick={logout} aria-label="Sign out"><LogoutIcon /></IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>
        </Toolbar>

        {/* Optional banners */}
        {(!hasW2W && whyW2W) || (!hasGCal && whyGCal) ? (
          <Box sx={{ px: { xs: 2, md: 4 }, pb: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {!hasW2W && whyW2W && (
              <Chip label={whyW2W} variant="outlined"
                sx={{ borderColor: "rgba(255,255,255,.5)", color: "#fff", backdropFilter: "blur(4px)", bgcolor: "rgba(0,0,0,.15)" }} />
            )}
            {!hasGCal && whyGCal && (
              <Chip label={whyGCal} variant="outlined"
                sx={{ borderColor: "rgba(255,255,255,.5)", color: "#fff", backdropFilter: "blur(4px)", bgcolor: "rgba(0,0,0,.15)" }} />
            )}
          </Box>
        ) : null}
      </AppBar>

      <Toolbar />
    </>
  );

}