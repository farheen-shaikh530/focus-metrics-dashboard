import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,

  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import ProductivityPanel from "@/components/ProductivityPanel";
import { Stack, Typography } from "@mui/material";

// tiny API helper
const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const txt = await res.text();
  const data = (() => { try { return JSON.parse(txt); } catch { return txt; } })();
  if (!res.ok) throw new Error((data as any)?.detail || txt || `HTTP ${res.status}`);
  return data as T;
}

type Weekly = { weekStart: string; count?: number; avgCycleMs?: number; onTimePct?: number };
type Metrics = { weeklyDone: Weekly[]; weeklyCycle: Weekly[]; weeklyOnTime: Weekly[] };

export default function Productivity() {
  const [m, setM] = useState<Metrics | null>(null);
  const [retro, setRetro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    j<Metrics>("/metrics/weekly").then(setM).catch(console.error);
  }, []);

  const runRetro = async () => {
    setLoading(true);
    try {
      const r = await j<{ text: string }>("/retro", { method: "POST", body: "{}" });
      setRetro(r.text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto", p: 3 }}>
     <Stack sx={{ p: 2 }} spacing={2}>
        <Typography variant="h4" fontWeight={800}>Productivity</Typography>
        <Typography sx={{ opacity: 0.75, mb: 1 }}>
          Quick weekly KPIs and an AI generated retrospective.
        </Typography>

        {/* ✅ Only the live panel (uses useTasks), no server KPI boxes */}
        <ProductivityPanel />
      </Stack>

 <Box mt={3}>
        <Button variant="contained" onClick={runRetro} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Run Weekly Retro (AI)"}
        </Button>

        {retro && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Weekly Retro</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography whiteSpace="pre-wrap">{retro}</Typography>
          </Paper>
        )}
      </Box>
      
      <Grid container spacing={2}>
      <Grid container spacing={2} sx={{ p: 2 }}>

          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">Completed (this week)</Typography>
            <Typography variant="h3" fontWeight={900}>
              {m?.weeklyDone?.[0]?.count ?? 0}
            </Typography>
          </Paper>
        </Grid>
       <Grid container spacing={2} sx={{ p: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">Avg cycle time</Typography>
            <Typography variant="h5" fontWeight={700}>
              {m?.weeklyCycle?.[0]?.avgCycleMs
                ? `${Math.round((m.weeklyCycle[0].avgCycleMs / 3_600_000) * 10) / 10} h`
                : "—"}
            </Typography>
          </Paper>
        </Grid>
      <Grid container spacing={2} sx={{ p: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">On-time %</Typography>
            <Typography variant="h3" fontWeight={900}>
              {m?.weeklyOnTime?.[0]?.onTimePct ?? 0}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button variant="contained" onClick={runRetro} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Run Weekly Retro (AI)"}
        </Button>

        {retro && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Weekly Retro
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography whiteSpace="pre-wrap">{retro}</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}