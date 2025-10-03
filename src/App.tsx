import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import { useAuth } from "./store/auth";

const Productivity = lazy(() => import("./pages/Productivity"));
const KanbanBoard  = lazy(() => import("./pages/KanbanBoard"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const BoardMobile  = lazy(() => import("./pages/BoardMobile"));

export default function App() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = useMemo(
    () => createTheme({ palette: { mode, primary: { main: "#FFD600" } } }),
    [mode]
  );

  const { hydrate } = useAuth();
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
          <Routes>
            {/* Public login route */}
            <Route path="/login" element={<Login />} />

            {/* Everything else is protected */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout mode={mode} setMode={setMode} />
                </RequireAuth>
              }
            >
             <Route index element={<BoardMobile />} />
              <Route path="todo" element={<KanbanBoard />} />
              <Route path="calendar" element={<CalendarView />} />
              <Route path="productivity" element={<Productivity />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}