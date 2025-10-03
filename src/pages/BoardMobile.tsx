import { useMemo, useState } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import { useTasks } from "@/store/useTasks";
import type { Task } from "@/types/task";
import { useAuth } from "@/store/auth";

type Tab = "active" | "in-progress" | "done";
type ChatMsg = { id: string; from: "user" | "bot"; text: string };

export default function BoardMobile() {
  const { user } = useAuth();
  const userName = (user?.name || user?.email || "there").split(" ")[0];

  const tasks = useTasks((s) => s.tasks);
  const update = useTasks((s) => s.updateTask);
  const remove = useTasks((s) => s.deleteTask);

  const [tab, setTab] = useState<Tab>("active");

  // --- Chatbot state ---
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: crypto.randomUUID(), from: "bot", text: `Hey ${userName}! Ask me about productivity, long-running tasks, or anything else.` },
  ]);
  const [input, setInput] = useState("");

  // --- Chat API helper ---
  async function askGemini(prompt: string, tasks: Task[]) {
    const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, tasks }),
      });
      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
      const data = (await res.json()) as { text: string };
      return data.text;
    } catch {
      // Dev fallback if backend not available
      return `I can’t reach the server right now. Quick thought: try timeboxing your next task for 25 minutes and mark it in-progress.`;
    }
  }

  const onSend = async () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((m) => [...m, { id: crypto.randomUUID(), from: "user", text: q }]);
    setInput("");

    const reply = await askGemini(q, tasks);
    setMsgs((m) => [...m, { id: crypto.randomUUID(), from: "bot", text: reply }]);
  };

  // completion %
  const pct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneCount = tasks.filter((t) => t.status === "done").length;
    return Math.round((doneCount / tasks.length) * 100);
  }, [tasks]);

  // list shown for the selected tab
  const shown = useMemo(() => {
    if (tab === "active") return tasks.filter((t) => t.status === "todo");
    if (tab === "in-progress") return tasks.filter((t) => t.status === "in-progress");
    return tasks.filter((t) => t.status === "done");
  }, [tasks, tab]);

  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === "todo").length,
    [tasks]
  );

  const onToggleDone = (t: Task) =>
    update(t.id, { status: t.status === "done" ? "todo" : "done" });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(142,45,226,.12) 0%, rgba(106,17,203,.10) 50%, rgba(142,45,226,.12) 100%)",
        p: 2,
        pb: 10,
      }}
    >
      {/* Header / Greeting */}
      <Stack spacing={1.2} sx={{ maxWidth: 700, mx: "auto" }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.5, mb: 0.5 }}>
              Hello, {userName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}
            >
              Productivity
            </Typography>
          </Box>

         
        </Box>

        <Typography
          variant="h2"
          sx={{
            fontWeight: 900,
            lineHeight: 1.1,
            mt: 1,
            fontFamily: "'Alfa Slab One', cursive",
            background: "linear-gradient(90deg, #8e2de2, #6a11cb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Mission <br /> Control
        </Typography>

        {/* Stats row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
          <Box>
            <Typography sx={{ opacity: 0.7 }}>You have</Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                fontFamily: "'Alfa Slab One', cursive",
                letterSpacing: 1,
                background: "linear-gradient(90deg, #FF4081, #FFD600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "1px 1px 2px rgba(0,0,0,0.15)",
                mb: 1,
              }}
            >
              {activeCount} tasks brewing… better sip ’em before they spill!
            </Typography>
          </Box>

          <Box sx={{ textAlign: "right", minWidth: 160 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Completed
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {pct}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 8,
                backgroundColor: "rgba(0,0,0,.08)",
                "& .MuiLinearProgress-bar": { backgroundColor: "#222" },
              }}
            />
          </Box>
        </Stack>

        {/* Toggle Active / In Progress / Done */}
        <ToggleButtonGroup
          exclusive
          color="primary"
          value={tab}
          onChange={(_, v) => v && setTab(v)}
          sx={{
            alignSelf: "flex-end",
            mt: 1,
            "& .MuiToggleButton-root": {
              borderRadius: 999,
              px: 2.2,
              textTransform: "none",
              fontWeight: 700,
            },
          }}
        >
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="in-progress">In&nbsp;Progress</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>

        {/* Simple list (you can swap to TaskPill later) */}
        <Stack spacing={2.2} sx={{ mt: 2 }}>
          {shown.length === 0 && (
            <Typography sx={{ opacity: 0.6, fontStyle: "italic", px: 0.5 }}>
              Nothing here yet — add a task!
            </Typography>
          )}
          {shown.map((t) => (
            <Box
              key={t.id}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {t.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  {t.status.replace("-", " ")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onToggleDone(t)}
                >
                  {t.status === "done" ? "Mark Active" : "Mark Done"}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => remove(t.id)}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>

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
          background: "linear-gradient(135deg, #8e2de2, #6a11cb)",
          color: "#fff",
          "&:hover": { background: "linear-gradient(135deg, #6a11cb, #8e2de2)" },
        }}
      >
        <ChatIcon />
      </Fab>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{ sx: { width: 360, display: "flex" } }}
      >
        <Stack sx={{ p: 2, width: "100%", height: "100%" }} spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
             Task Coach
          </Typography>
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
                    px: 1.2,
                    py: 0.8,
                    borderRadius: 2,
                    maxWidth: "80%",
                    bgcolor:
                      m.from === "user" ? "primary.main" : "rgba(0,0,0,0.06)",
                    color: m.from === "user" ? "#fff" : "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Input row */}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="Ask about your tasks…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <IconButton color="primary" onClick={onSend} aria-label="Send">
              <SendIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Drawer>
    </Box>
  );
}