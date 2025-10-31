// src/components/AppLayout.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import { useAuth } from "../store/auth";
import LoginDialog from "./LoginDialog";

export default function AppLayout({
  mode,
  setMode,
}: { mode:"light"|"dark"; setMode:(m:"light"|"dark")=>void }) {
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const showLogin = !user && loc.pathname === "/login";

  return (
    
    <Box sx={{ minHeight: "100dvh", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
      <Header mode={mode} setMode={setMode} />
      {/* Spacer for fixed AppBar height so content isn’t hidden under it */}
    <Toolbar />

      {/* Only render the dialog on /login so it won't block other pages */}
      {showLogin && (
        <LoginDialog
          open
          onClose={() => nav("/")}  // close sends user back home
        />
      )}

      {/* Routed pages render here */}
      <Box component="main" sx={{ p: 2 }}>
        <Outlet />
      </Box>

      <Footer />
    </Box>
  );
}