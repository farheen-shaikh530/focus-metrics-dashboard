import { useMemo } from "react";
import { useTasks } from "../store/useTasks";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader } from "@mui/material";
import dayjs from "dayjs";

export default function WeeklyProgressChart({ weeks = 8 }: { weeks?: number }) {
  const getWeeklyDoneCounts = useTasks(s => s.getWeeklyDoneCounts);

  const data = useMemo(() => {
    const rows = getWeeklyDoneCounts(weeks);
    return rows.map(r => ({
      week: dayjs(r.weekStart).format("MMM D"),
      count: r.count
    }));
  }, [getWeeklyDoneCounts, weeks]);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader title="Weekly Done Tasks" subheader={`${weeks} weeks`} />
      <CardContent sx={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}