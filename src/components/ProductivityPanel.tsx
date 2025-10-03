// src/components/ProductivityPanel.tsx
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";

import Grid from '@mui/material/Grid';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useTasks } from "../store/useTasks";
import { rechartsColors } from "../theme";
import Footer from "../components/Footer";


const WEEKS = 8;

type WeekRow = {
  weekStart: string; // ISO date string
  done: number;
  avgCycleH: number; // hours
  onTimePct: number; // 0..100
};

export default function ProductivityPanel() {
  // ✅ Option 1 fix: use simple selectors (no shallow argument)
  const tasks = useTasks((s) => s.tasks);
  const getWeeklyDoneCounts = useTasks((s) => s.getWeeklyDoneCounts);
  const getWeeklyCycleTime = useTasks((s) => s.getWeeklyCycleTime);
  const getWeeklyOnTimeRate = useTasks((s) => s.getWeeklyOnTimeRate);
  const getAssigneeStats = useTasks((s) => s.getAssigneeStats);

  // Recompute when tasks change (functions are stable)
  const weeklyDone = useMemo(
    () => getWeeklyDoneCounts(WEEKS),
    [getWeeklyDoneCounts, tasks]
  );
  const weeklyCycle = useMemo(
    () => getWeeklyCycleTime(WEEKS),
    [getWeeklyCycleTime, tasks]
  );
  const weeklyOnTime = useMemo(
    () => getWeeklyOnTimeRate(WEEKS),
    [getWeeklyOnTimeRate, tasks]
  );
  const assignee = useMemo(
    () => getAssigneeStats(),
    [getAssigneeStats, tasks]
  );

  // Merge weekly series for the charts
  const merged: WeekRow[] = useMemo(() => {
    const by = new Map<string, WeekRow>();

    weeklyDone.forEach((d: any) => {
      by.set(d.weekStart, {
        weekStart: d.weekStart,
        done: d.count ?? 0,
        avgCycleH: 0,
        onTimePct: 0,
      });
    });

    weeklyCycle.forEach((c: any) => {
      const row =
        by.get(c.weekStart) ??
        ({
          weekStart: c.weekStart,
          done: 0,
          avgCycleH: 0,
          onTimePct: 0,
        } as WeekRow);
      row.avgCycleH = Number(((c.avgCycleMs ?? 0) / 3_600_000).toFixed(2));
      by.set(c.weekStart, row);
    });

    weeklyOnTime.forEach((o: any) => {
      const row =
        by.get(o.weekStart) ??
        ({
          weekStart: o.weekStart,
          done: 0,
          avgCycleH: 0,
          onTimePct: 0,
        } as WeekRow);
      row.onTimePct = o.onTimePct ?? 0;
      by.set(o.weekStart, row);
    });

    return Array.from(by.values()).sort(
      (a, b) => dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf()
    );
  }, [weeklyDone, weeklyCycle, weeklyOnTime]);

  const assigneeData = useMemo(
    () =>
      assignee.map((a: any) => ({
        name: a.assignee,
        done: a.completed ?? 0,
        inProgress: a.inProgress ?? 0,
        hours: Number(((a.totalTimeMs ?? 0) / 3_600_000).toFixed(1)),
      })),
    [assignee]
  );

  const weekLabel = (w: string) => dayjs(w).format("MMM D");
  const weekTooltip = (w: string | number) =>
    dayjs(String(w)).format("MMM D, YYYY");

  const last: WeekRow | null = merged.length ? merged[merged.length - 1] : null;
  const hasData = merged.length > 0 || assigneeData.length > 0;

  if (!hasData) {
    return (
      <Stack sx={{ p: 2 }} spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Productivity Overview
        </Typography>
        <Typography sx={{ opacity: 0.7 }}>
          No productivity data yet. Create and complete a few tasks to see charts.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack sx={{ p: 2 }} spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Productivity Overview
      </Typography>

      <Grid container spacing={2}>
        {/* Weekly throughput */}
       
            <Grid size={6}>

            
        <Card
  variant="outlined"
  sx={{
    background: "linear-gradient(135deg, #D8F8A3, #B2FF59)", // warm lime
    border: "none",
    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
  }}
>

            <CardHeader
              title="Weekly Throughput"
              subheader="Tasks moved to Done"
            />
            <CardContent sx={{ height: 360 }}>
                <div aria-label="Weekly throughput bar chart. Shows tasks done per week over the last 8 weeks." role="img">

                <ResponsiveContainer width="100%" height="100%">

                <BarChart data={merged}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekStart" tickFormatter={weekLabel} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={weekTooltip} />
                  <Legend />
                  <Bar dataKey="done" name="Done" fill={rechartsColors.bar} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Avg Cycle + On-time */}
         <Grid size={6}>
            
        <Card
  variant="outlined"
  sx={{
    background: "linear-gradient(135deg, #D8F8A3, #B2FF59)", // warm lime
    border: "none",
    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
  }}
>

            <CardHeader
              title="Avg Cycle Time & On-time"
              subheader="By ISO week"
            />
            <CardContent sx={{ height: 360 }}>
                <div aria-label="Weekly throughput bar chart. Shows tasks done per week over the last 8 weeks." role="img">

               <ResponsiveContainer width="100%" height="100%">

                <LineChart data={merged}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekStart" tickFormatter={weekLabel} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={weekTooltip}
                    formatter={(val, key) =>
                      key === "onTimePct"
                        ? [`${val}%`, "On-Time"]
                        : [`${val} h`, "Avg Cycle"]
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgCycleH"
                    name="Avg Cycle (h)"
                    stroke={rechartsColors.line}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="onTimePct"
                    name="On-Time (%)"
                    stroke={rechartsColors.altBar}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Latest week summary */}
         <Grid size={6}>
            
         <Card
  variant="outlined"
  sx={{
    background: "linear-gradient(135deg, #D8F8A3, #B2FF59)", // warm lime
    border: "none",
    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
  }}
>
 <CardHeader title="Latest Week Summary" />
<CardContent>
  {last ? (
    <Stack spacing={1}>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {weekTooltip(last.weekStart)}
      </Typography>
      <Typography variant="body2">
        <strong>Done:</strong> {last.done}
      </Typography>
      <Typography variant="body2">
        <strong>Avg Cycle:</strong> {last.avgCycleH}h
      </Typography>
      <Typography variant="body2">
        <strong>On-Time:</strong> {Number(last.onTimePct).toFixed(0)}%
      </Typography>
    </Stack>
  ) : (
    <Typography variant="body2" sx={{ opacity: 0.7 }}>
      No weekly data available yet.
    </Typography>
  )}
</CardContent>

          </Card>

        </Grid>
      </Grid>
    </Stack>
  );
}