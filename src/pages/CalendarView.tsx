// src/pages/CalendarView.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Chip,
  Typography,
  Button,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material";

type Shift = {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  location?: string;
  notes?: string;
};

const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// Small fetch->json helper
async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(data?.detail || text || `HTTP ${res.status}`);
  return data as T;
}

export default function CalendarView() {
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    try {
      setLoading(true);
      // only upcoming (end time > now) and 14 days window
      const data = await j<{ items: Shift[]; cachedAt?: string }>(
        `/w2w/shifts?days=14&upcoming=true`
      );
      setItems(data.items ?? []);
      setMsg("");
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const importTasks = async () => {
    try {
      const r = await j<{ created: number; updated: number }>(
        `/w2w/sync-to-tasks`,
        { method: "POST" }
      );
      setMsg(`Imported shifts → tasks. Created ${r.created}, Updated ${r.updated}.`);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto", p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">

<Typography
  variant="h6"
  sx={{
    fontWeight: 900,
    color: "#fff",
    textTransform: "uppercase",
    borderBottom: "3px solid #FFD600",
    display: "inline-block",
    pb: 0.3,
    mb: 1.5,
  }}
>
  Upcoming Shifts
</Typography>




        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
         

        </Stack>
      </Stack>

      {msg && (
        <Alert sx={{ mt: 2 }} onClose={() => setMsg("")}>
          {msg}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {loading ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 1.5 }}>Loading upcoming shifts…</Typography>
        </Box>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">No upcoming shifts found 🎉</Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {items.map((s) => {
            const start = new Date(s.start);
            const end = new Date(s.end);
            const label =
              `${start.toLocaleString([], { weekday: "short" })} ` +
              `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–` +
              `${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ` +
              `${s.title}${s.location ? ` @ ${s.location}` : ""}`;
            return (
              <Chip
                key={s.id}
                label={label}
                variant="outlined"
                sx={{ m: 0.5 }}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
}