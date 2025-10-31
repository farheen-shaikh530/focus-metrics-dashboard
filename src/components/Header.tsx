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
} from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import { useMemo } from "react";
import { useAuth } from "@/store/auth";

export default function Header({
  mode,
  setMode,
}: {
  mode: "light" | "dark";
  setMode: (m: "light" | "dark") => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
      "&.active": {
        bgcolor: "rgba(255,255,255,0.22)",
        borderColor: "rgba(255,255,255,0.0)",
      },
      "&.Mui-disabled": {
        color: "rgba(255,255,255,0.6)",
        borderColor: "rgba(255,255,255,0.25)",
      },
    }),
    []
  );

  return (
    <Box>
      <AppBar
        position="fixed"
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 2,
          backgroundColor: "#a0822a",
          backgroundImage: "url('/header-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#fff",
          boxShadow: "none",
          pointerEvents: "auto",
        })}
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
            pointerEvents: "auto",
          }}
        >
          {/* Left: Home + Title */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              component={NavLink}
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

          {/* Center: Nav */}
          <Stack direction="row" spacing={1.25} alignItems="center">
            {[
              { label: "Productivity", path: "/productivity" },
              { label: "To-Do",        path: "/todo" },
              { label: "Calendar",     path: "/calendar" },
            ].map((b) => (
              <Button
                key={b.label}
                component={NavLink}
                to={b.path}
                sx={pillBtnSx}
              >
                {b.label}
              </Button>
            ))}
          </Stack>

          {/* Right: Auth */}
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
                  sx={{ width: 36, height: 36, border: "2px solid rgba(255,255,255,0.4)" }}
                />
              </Tooltip>
              <IconButton color="inherit" onClick={logout} aria-label="Sign out">
                <LogoutIcon />
              </IconButton>
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      {/* NOTE: no <Outlet /> here */}
    </Box>
  );
}