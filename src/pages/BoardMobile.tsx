// src/pages/BoardMobile.tsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useGoals } from "@/store/goals";
import { usePrefs } from "@/store/prefs";
import { useTasks } from "@/store/useTasks";
import { useAuth } from "@/store/auth";
import type { Task } from "@/types/task";
import { topSuggestions } from "@/utils/priority";
import { TipsDialog } from "@/components";
import ShiftStrip from "@/components/ShiftStrip";



import {
  Box,
  Stack,
  Typography,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Fab,
  Drawer,
  TextField,
  IconButton,
  Divider,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";

type Tab = "active" | "in-progress" | "done";
type ChatMsg = { id: string; from: "user" | "bot"; text: string };

export default function BoardMobile() {
  // ----- stores / hooks -----
  const { user } = useAuth();
  const { pepTalkStyle } = usePrefs();
  const { weeklyGoal, streakDays } = useGoals();
  const tasks = useTasks((s) => s.tasks);
  const update = useTasks((s) => s.updateTask);
  const remove = useTasks((s) => s.deleteTask);

  // ----- UI state -----
  const [tab, setTab] = useState<Tab>("active");
  const [chatOpen, setChatOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // chat messages
  const userFirst = (user?.name || user?.email || "there").split(" ")[0];
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: crypto.randomUUID(),
      from: "bot",
      text: `Hey ${userFirst}! Ask me about productivity, long-running tasks, or anything else.`,
    },
  ]);

  // autoscroll anchor
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  // ----- greetings / copy -----
  const name = (user?.name || user?.email || "friend").split(" ")[0];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const line =
    {
      funny: "Your tasks are gossiping—go show them who’s boss 😎",
      coach: "Small wins stack up—pick one task and start now 💪",
      calm: "One gentle step at a time—focus on a single task 🌿",
    }[pepTalkStyle] || "Small wins stack up—pick one task and start now 💪";

  // ----- derived metrics -----
  const pct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneCount = tasks.filter((t) => t.status === "done").length;
    return Math.round((doneCount / tasks.length) * 100);
  }, [tasks]);

  const shown = useMemo(() => {
    if (tab === "active") return tasks.filter((t) => t.status === "todo");
    if (tab === "in-progress") return tasks.filter((t) => t.status === "in-progress");
    return tasks.filter((t) => t.status === "done");
  }, [tasks, tab]);

  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === "todo").length,
    [tasks]
  );

  const doneThisWeek = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "done" &&
          new Date(t.updatedAt) > new Date(Date.now() - 7 * 86400000)
      ).length,
    [tasks]
  );
  const suggestions = useMemo(() => topSuggestions(tasks, 3), [tasks]);
  // ----- task actions -----
  const onToggleDone = (t: Task) =>
  update(t.id, { status: t.status === "done" ? "todo" : "done" });

  // ----- chat API helper -----
  async function askGemini(prompt: string, tasksForCtx: Task[]) {
    // ensure the same base URL that you used in curl
    const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, tasks: tasksForCtx }),
    });
    const raw = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      /* ignore plain text */
    }
    if (!res.ok) throw new Error(data?.detail || raw || `HTTP ${res.status}`);
    return data?.text || raw;
  }
// Create tasks from W2W shifts (skip duplicates by deterministic id)
async function importShiftsAsTasks() {
  try {
    const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
    const res = await fetch(`${API}/w2w/shifts`);
    const data = await res.json();

    const items: Array<{
      id: string; title: string; start: string; end: string; location?: string;
    }> = data.items || [];

    const existing = useTasks.getState().tasks;
    const hasId = new Set(existing.map(t => t.id));

    let created = 0;
    for (const s of items) {
      const tid = `w2w-${s.id}`;       // deterministic -> prevents duplicates
      if (hasId.has(tid)) continue;

      const nowISO = new Date().toISOString();
      const loc = s.location?.trim() || "—";
      const title = `Shift: ${s.title || "Shift"} @ ${loc}`;

      useTasks.getState().addTask({
        id: tid,
        title,
        description: `From W2W: ${new Date(s.start).toLocaleString()} → ${new Date(s.end).toLocaleString()}`,
        priority: "medium",
        status: "todo",
        createdAt: s.start ?? nowISO,
        updatedAt: s.start ?? nowISO,
        dueDate: s.end ?? undefined,
      });

      created++;
    }

    alert(`✅ Imported ${created} shift${created === 1 ? "" : "s"} as tasks`);
  } catch (e) {
    console.error(e);
    alert("⚠️ Couldn’t import shifts. Check the server and try again.");
  }
}

  // quick-pick prompts
  const quickPrompts = [
    "Give me 2 focus tips",
    "Which task is longest?",
    "What should I do next?",
    "Make a 25-min plan",
  ];

  const sendPrompt = async (text: string) => {
    setInput(text);
    await onSend(text);
  };

  // onSend (supports optional direct text)
  const onSend = async (directText?: string) => {
    const q = (directText ?? input).trim();
    if (!q) return;

    setMsgs((m) => [...m, { id: crypto.randomUUID(), from: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askGemini(q, tasks);
      setMsgs((m) => [...m, { id: crypto.randomUUID(), from: "bot", text: reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          from: "bot",
          text:
            "I couldn’t reach the coach just now. Try again in a bit — meanwhile, pick one task and timebox 25 minutes.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        backgroundImage: 'url("/dashboard-bg.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        p: 2,
        pb: 10,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,.45))",
          zIndex: 0,
        },
      }}
    >
      <Box sx={{ mt: 1 }}>
 
  <ShiftStrip />
</Box>

      {/* content wrapper to sit above the dim overlay */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        {/* Header / Greeting */}
        <Stack
          spacing={3}
          sx={{
            maxWidth: 920,
            mx: "auto",
            alignItems: "flex-start",
            textAlign: "left",
            mt: 4,
          }}
        >
          <Box
            display="flex"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={2}
            width="100%"
          >
            {/* Glass hero */}
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                background: "rgba(0, 0, 0, 0.35)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                width: "100%",
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,.35)" }}>
                Good {timeOfDay},
                <br />
                <Box component="span" sx={{ color: "#ffd54f" }}>
                  {name}
                </Box>
              </Typography>

              <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.3)" }}>
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: 2, color: "rgba(255,255,255,0.8)" }}
                >
                  Focus Zone
                </Typography>
              </Divider>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  color: "#ffeb3b",
                  textShadow: "0 3px 12px rgba(0,0,0,.45)",
                  mb: 1,
                }}
              >
                My Week at a Glance

              </Typography>

              <Typography sx={{ opacity: 0.9 }}>{line}</Typography>

              <Box
                sx={{
                  mt: 1.5,
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.35)",
                  pb: 1,
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  🗓️ Weekly goal: {doneThisWeek}/{weeklyGoal}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  🔥 Streak: {streakDays} day{streakDays === 1 ? "" : "s"}
                </Typography>
              </Box>

              <Typography
                variant="h6"
                sx={{ mt: 2, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,.35)" }}
              >
                {activeCount} tasks brewing…
              </Typography>

              {shown.length === 0 && (
                <Typography
                  sx={{ mt: 1, color: "rgba(255,255,255,0.85)", fontStyle: "italic" }}
                >
                  Nothing here yet — add a task!
                </Typography>
              )}
            </Box>

            {/* Tips button */}
            <Button
              variant="outlined"
              onClick={() => setTipsOpen(true)}
              sx={{
                alignSelf: "flex-start",
                borderRadius: 999,
                px: 2.5,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#ffd54f",
                color: "#ffd54f",
                "&:hover": { borderColor: "#ffeb3b", color: "#ffeb3b" },
              }}
            >
              Quick Tips
            </Button>
          </Box>

          {/* Stats row */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 1, width: "100%" }}
          >
            <Box>
              <Typography sx={{ opacity: 0.8, color: "#fff" }}>Completed</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#fff" }}>
                {pct}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  mt: 0.5,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,.2)",
                  "& .MuiLinearProgress-bar": { backgroundColor: "#fff" },
                  width: 240,
                }}
              />
            </Box>

            <ToggleButtonGroup
              exclusive
              color="primary"
              value={tab}
              onChange={(_, v) => v && setTab(v)}
              sx={{
                "& .MuiToggleButton-root": {
                  borderRadius: 999,
                  px: 2.2,
                  textTransform: "none",
                  fontWeight: 700,
                  backdropFilter: "blur(6px)",
                  background: "rgba(255,255,255,0.25)",
                  color: "#000",
                },
              }}
            >
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="in-progress">In&nbsp;Progress</ToggleButton>
              <ToggleButton value="done">Done</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Task list */}
          <Stack spacing={2.2} sx={{ mt: 2, width: "100%" }}>
            {shown.map((t) => (
              <Box
                key={t.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  border: (th) => `1px solid ${th.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {t.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t.status.replace("-", " ")}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexShrink={0}>
                  <Button size="small" variant="outlined" onClick={() => onToggleDone(t)}>
                    {t.status === "done" ? "Mark Active" : "Mark Done"}
                  </Button>
                  <Button size="small" variant="text" color="error" onClick={() => remove(t.id)}>
                    Delete
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* Floating Chatbot Button */}
      <Fab
        aria-label="chatbot"
        onClick={() => setChatOpen(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:hover": { bgcolor: "primary.dark" },
        }}
      >
        <ChatIcon />
      </Fab>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{
          sx: {
            width: 360,
            display: "flex",
            bgcolor: "background.paper",
            backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0))",
          },
        }}
      >
        <Stack sx={{ p: 2, width: "100%", height: "100%" }} spacing={1.5}>
          {/* Header */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
              aria-hidden
            >
              🤖
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                Momentum Coach
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Ask about focus, priorities, or your tasks
              </Typography>
            </Box>
          </Box>

          {/* Quick prompts */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {quickPrompts.map((p) => (
              <Button
                key={p}
                size="small"
                variant="outlined"
                onClick={() => sendPrompt(p)}
                sx={{ borderRadius: 999, textTransform: "none" }}
              >
                {p}
              </Button>
            ))}
          </Stack>

          <Divider />

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
            {msgs.map((m) => (
              <Box
                key={m.id}
                sx={{
                  my: 1,
                  display: "flex",
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.9,
                    borderRadius: 2,
                    maxWidth: "80%",
                    bgcolor: m.from === "user" ? "primary.main" : "action.hover",
                    color: m.from === "user" ? "primary.contrastText" : "text.primary",
                    boxShadow: 1,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </Box>
              </Box>
            ))}

            {/* Typing indicator */}
            {loading && (
              <Box sx={{ my: 1, display: "flex", justifyContent: "flex-start" }}>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.9,
                    borderRadius: 2,
                    maxWidth: "70%",
                    bgcolor: "action.hover",
                    color: "text.secondary",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>Coach is typing</span>
                  <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "text.disabled",
                        animation: "b 1s infinite",
                      }}
                    />
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "text.disabled",
                        animation: "b 1s .15s infinite",
                      }}
                    />
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "text.disabled",
                        animation: "b 1s .3s infinite",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
            <Box ref={endRef} />
          </Box>

          {/* Input row */}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="Ask about your tasks…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
            />
            <IconButton color="primary" onClick={() => onSend()} aria-label="Send">
              <SendIcon />
            </IconButton>
          </Stack>
        </Stack>

        {/* typing dots keyframes (scoped) */}
        <style>
          {`@keyframes b {
              0% { opacity:.2; transform:translateY(0) }
             50% { opacity:1; transform:translateY(-2px) }
            100% { opacity:.2; transform:translateY(0) }
          }`}
        </style>
      </Drawer>

      {/* Tips dialog */}
      <TipsDialog open={tipsOpen} onClose={() => setTipsOpen(false)} />
    </Box>
  );
}