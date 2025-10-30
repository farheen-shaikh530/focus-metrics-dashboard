// src/components/ProductivityPanel.tsx
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  Grid,
} from "@mui/material";
import { useMemo, useEffect } from "react";
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
import { useTasks } from "@/store/useTasks";

const WEEKS = 8;

type WeekRow = {
  weekStart: string; // ISO
  done: number;
  avgCycleH: number;
  onTimePct: number;
};

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card
      variant="outlined"
      sx={{
        background: "linear-gradient(135deg, #FDF7E3, #FFF9C4)",
        border: "none",
        width: 220,
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <CardContent>
        <Typography variant="subtitle2" sx={{ opacity: 0.7 }}>
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ProductivityPanel() {
  // Zustand selectors
  const tasks = useTasks((s) => s.tasks);
  const getWeeklyDoneCounts = useTasks((s) => s.getWeeklyDoneCounts);
  const getWeeklyCycleTime = useTasks((s) => s.getWeeklyCycleTime);
  const getWeeklyOnTimeRate = useTasks((s) => s.getWeeklyOnTimeRate);
  const getAssigneeStats = useTasks((s) => s.getAssigneeStats);

  // TEMP: see what KPIs see
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.table(
      tasks.map((t) => ({
        title: t.title,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        completedAt: (t as any).completedAt ?? null,
        dueDate: t.dueDate ?? null,
      }))
    );
  }, [tasks]);

  // --- KPIs (this week) computed on client, update when tasks change
  const metrics = useMemo(() => {
    const now = new Date();

    // Monday-based week window
    const weekStart = new Date(now);
    const day = weekStart.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day + 6) % 7;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // All done tasks
    const done = tasks.filter((t) => t.status === "done");

    // Done within this week (use completedAt when present, else updatedAt)
    const inThisWeek = done.filter((t) => {
      const finished = new Date((t as any).completedAt ?? t.updatedAt);
      return finished >= weekStart && finished < weekEnd;
    });

    // Cycle times in hours from createdAt -> completion
    const cycles = inThisWeek
      .map(
        (t) =>
          (new Date((t as any).completedAt ?? t.updatedAt).getTime() -
            new Date(t.createdAt).getTime()) /
          3_600_000
      )
      .filter((h) => h >= 0);

    const avgCycleHours =
      cycles.length > 0
        ? +(cycles.reduce((a, b) => a + b, 0) / cycles.length).toFixed(2)
        : 0;

    // On-time % (compare completion to dueDate when dueDate exists)
    const withDue = inThisWeek.filter((t) => !!t.dueDate);
    const onTime = withDue.filter(
      (t) =>
        new Date((t as any).completedAt ?? t.updatedAt) <=
        new Date(t.dueDate as string)
    );
    const onTimePct =
      withDue.length > 0
        ? Math.round((onTime.length / withDue.length) * 100)
        : 0;

    return {
      completed: inThisWeek.length,
      avgCycleHours,
      onTimePct,
    };
  }, [tasks]);

  // --- Weekly series for charts (from store helpers)
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
  const assignee = useMemo(() => getAssigneeStats(), [getAssigneeStats, tasks]);

  // Merge the series for charts
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
  const hasSeries = merged.length > 0 || assigneeData.length > 0;

  return (
    <Stack sx={{ p: 2 }} spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Productivity Overview
      </Typography>

      {/* KPIs always visible */}
      <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: "wrap" }}>
        <KpiCard title="Completed (this week)" value={metrics.completed} />
        <KpiCard title="Avg Cycle Time" value={`${metrics.avgCycleHours} h`} />
        <KpiCard title="On-time %" value={`${metrics.onTimePct}%`} />
      </Stack>

      {!hasSeries ? (
        <Typography sx={{ opacity: 0.7 }}>
          No productivity history yet. Complete a few tasks to see trends.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {/* Weekly Throughput */}
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                background: "linear-gradient(135deg, #D8F8A3, #B2FF59)",
                border: "none",
                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
              }}
            >
              <CardHeader title="Weekly Throughput" subheader="Tasks moved to Done" />
              <CardContent sx={{ height: 360 }}>
                <div
                  aria-label="Weekly throughput bar chart. Shows tasks done per week over the last 8 weeks."
                  role="img"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={merged}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="weekStart" tickFormatter={weekLabel} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={weekTooltip} />
                      <Legend />
                      <Bar dataKey="done" name="Done" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>

          {/* Avg Cycle + On-time */}
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                background: "linear-gradient(135deg, #D8F8A3, #B2FF59)",
                border: "none",
                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
              }}
            >
              <CardHeader title="Avg Cycle Time & On-time" subheader="By ISO week" />
              <CardContent sx={{ height: 360 }}>
                <div
                  aria-label="Average cycle time and on-time percentage by week."
                  role="img"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={merged}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="weekStart" tickFormatter={weekLabel} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip
                        labelFormatter={weekTooltip}
                        formatter={(val: any, key: string) =>
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
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="onTimePct"
                        name="On-Time (%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>

          {/* Latest week summary */}
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                background: "linear-gradient(135deg, #D8F8A3, #B2FF59)",
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
      )}
    </Stack>
  );
}