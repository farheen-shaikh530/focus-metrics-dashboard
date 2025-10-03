import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import googleCalendarPlugin from "@fullcalendar/google-calendar";
import { Box, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";

import { useTasks } from "../store/useTasks";
import type { Task } from "../types/task";

// correct type imports
import type { EventInput, DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";

// Vite envs
const apiKey = import.meta.env.VITE_GCAL_API_KEY as string | undefined;
const calendarId = import.meta.env.VITE_GCAL_CALENDAR_ID as string | undefined;

function colorForStatus(status: Task["status"]) {
  switch (status) {
    case "done":
      return "#2e7d32";
    case "in-progress":
      return "#fbc02d";
    default:
      return "#0288d1";
  }
}

export default function CalendarView() {
  const tasks = useTasks((s) => s.tasks);
  const update = useTasks((s) => s.updateTask);

  // map tasks with dueDate into calendar events
  const taskEvents: EventInput[] = useMemo(
    () =>
      tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: t.id,
          title: t.title,
          start: t.dueDate, // ISO (YYYY-MM-DD)
          allDay: true,
          backgroundColor: colorForStatus(t.status),
          borderColor: colorForStatus(t.status),
        })),
    [tasks]
  );

  const onEventDrop = (info: EventDropArg) => {
    // only update if this event belongs to our task store
    const taskId = info.event.id;
    if (!tasks.some((t) => t.id === taskId)) return;
    const newDate = dayjs(info.event.start!).format("YYYY-MM-DD");
    update(taskId, { dueDate: newDate });
  };

  const onSelect = (arg: DateSelectArg) => {
    const title = prompt("New task title?");
    if (!title) return;
    useTasks.getState().addTask({
      title,
      description: "",
      priority: "medium",
      status: "todo",
      dueDate: dayjs(arg.start).format("YYYY-MM-DD"),
    });
  };

  const onEventClick = (info: EventClickArg) => {
    const when = info.event.start ? dayjs(info.event.start).format("MMM D, YYYY") : "";
    alert(`Event: ${info.event.title}\nDate: ${when}`);
  };

  const calendarPlugins = [dayGridPlugin, timeGridPlugin, interactionPlugin] as any[];
  if (apiKey && calendarId) calendarPlugins.push(googleCalendarPlugin);

  const googleEventSource =
    apiKey && calendarId
      ? {
          googleCalendarId: calendarId,
        }
      : undefined;

  return (
    <Stack sx={{ p: 2 }} spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Calendar
      </Typography>

      <Box sx={{ bgcolor: "#fff", borderRadius: 2, boxShadow: 1, p: 1 }}>
        <FullCalendar
          plugins={calendarPlugins}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="78vh"
          selectable
          selectMirror
          dayMaxEvents
          // our tasks:
          events={taskEvents}
          // optional Google feed:
          {...(googleEventSource ? { eventSources: [googleEventSource], googleCalendarApiKey: apiKey } : {})}
          // interactions:
          editable
          eventDrop={onEventDrop}
          select={onSelect}
          eventClick={onEventClick}
        />
      </Box>
    </Stack>
  );
}