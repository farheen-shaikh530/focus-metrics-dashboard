// src/App.tsx
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState, Suspense } from "react";

import RequireAuth from "./components/RequireAuth";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";

import Productivity from "./pages/Productivity";
import CalendarView from "./pages/CalendarView";
import KanbanBoard from "./pages/KanbanBoard";
import BoardMobile from "./pages/BoardMobile";
import { useAuth } from "./store/auth";

export default function App() {
  const [mode, setMode] = useState<"light" | "dark">("light");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#FFD600" },
        },
      }),
    [mode]
  );

  const { hydrate } = useAuth();
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected layout and pages */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout mode={mode} setMode={setMode} />
                </RequireAuth>
              }
            >
              <Route index element={<BoardMobile />} />
              <Route path="todo" element={<KanbanBoard />} />
              <Route path="productivity" element={<Productivity />} />
              <Route path="calendar" element={<CalendarView />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}