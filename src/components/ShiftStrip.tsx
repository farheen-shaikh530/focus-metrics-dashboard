// src/components/ShiftStrip.tsx
import { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography, Skeleton } from "@mui/material";

interface Shift {
  id: string;
  role: string;
  location: string;
  start: string;
  end: string;
}

export default function ShiftStrip() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadShifts() {
      try {
        const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
        const r = await fetch(`${API}/w2w/shifts?days=7`);
        if (!r.ok) throw new Error(`Failed: ${r.status}`);
        const data = await r.json();
        setShifts(data.items || []);
      } catch (err) {
        console.error("W2W fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadShifts();
  }, []);

  if (loading) {
    return (
      <Stack direction="row" spacing={1}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" width={160} height={32} />
        ))}
      </Stack>
    );
  }

  if (shifts.length === 0) {
    return (
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        No shifts scheduled this week 🌤️
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
      {shifts.slice(0, 3).map((s) => {
        const start = new Date(s.start).toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const end = new Date(s.end).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <Chip
            key={s.id}
            label={`${start}–${end} • ${s.role} @ ${s.location}`}
            sx={{
              borderRadius: 999,
              bgcolor: "rgba(106,17,203,0.1)",
              color: "primary.main",
              fontWeight: 600,
            }}
          />
        );
      })}
    </Stack>
  );
}