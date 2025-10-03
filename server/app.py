# server/app.py
from __future__ import annotations

import os
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# -------- Env / Gemini --------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

try:
    import google.generativeai as genai
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY")
    genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_READY = True
except Exception:
    GEMINI_READY = False

# -------- Optional Google token verification --------
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_READY = True
except Exception:
    GOOGLE_READY = False

GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")  # optional audience check

# -------- App / CORS --------
app = FastAPI()

allow_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- Domain models --------
Status = Literal["todo", "in-progress", "done"]
Priority = Literal["low", "medium", "high", "urgent"]

class Task(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    priority: Priority
    status: Status
    dueDate: Optional[str] = None
    estimateMinutes: Optional[int] = None
    timeSpentMs: Optional[int] = None
    timerStartedAt: Optional[str] = None
    createdAt: str
    updatedAt: str

class TaskPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: Priority | None = None
    status: Status | None = None
    dueDate: str | None = None
    estimateMinutes: int | None = None
    timeSpentMs: int | None = None
    timerStartedAt: str | None = None

# -------- In-memory DB --------
DB: dict[str, Task] = {}

# -------- Health --------
@app.get("/")
def home():
    return {"message": "Hello from FastAPI 🚀"}

# -------- Tasks API --------
@app.get("/tasks", response_model=List[Task])
def list_tasks():
    return list(DB.values())

@app.post("/tasks", response_model=Task)
def create_task(task: Task):
    DB[task.id] = task
    return task

@app.patch("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, patch: TaskPatch):
    t = DB.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="not found")
    data = t.model_dump()
    data.update(patch.model_dump(exclude_unset=True))
    data["updatedAt"] = datetime.utcnow().isoformat()
    DB[task_id] = Task(**data)
    return DB[task_id]

@app.get("/metrics/weekly")
def weekly_metrics():
    return {
        "weeklyDone":  [{"weekStart": "2025-09-01", "count": 3}],
        "weeklyCycle": [{"weekStart": "2025-09-01", "avgCycleMs": 3_600_000}],
        "weeklyOnTime": [{"weekStart": "2025-09-01", "onTimePct": 80}],
    }

# -------- Chat (Gemini) --------

  # -------- Chat (Gemini) --------
class ChatReq(BaseModel):
    prompt: str
    tasks: list[dict] | None = None   # optional task context

class ChatRes(BaseModel):
    text: str

@app.post("/chat", response_model=ChatRes)
def chat(req: ChatReq):
    if not GEMINI_READY:
        # Fallback heuristic so you still get helpful output during setup
        q = req.prompt.lower()
        if req.tasks and "longer" in q and "task" in q:
            longest = max(req.tasks, key=lambda t: t.get("timeSpentMs", 0), default=None)
            if longest:
                hours = round((longest.get("timeSpentMs", 0) or 0) / 3_600_000, 2)
                return ChatRes(text=f"‘{longest.get('title','(untitled)')}’ has the most time logged: ~{hours}h.")
        return ChatRes(text="I can’t reach Gemini right now. Try a 25-minute timebox on your next task.")

    try:
        # Compact context to keep prompts small
        summary_lines: List[str] = []
        if req.tasks:
            for t in req.tasks[:50]:
                summary_lines.append(
                    f"- {t.get('title','(untitled)')} | "
                    f"status={t.get('status')} | spent={t.get('timeSpentMs',0)}ms | "
                    f"created={t.get('createdAt')}"
                )
        summary = (
            "Here are the user's recent tasks:\n" + "\n".join(summary_lines)
            if summary_lines else ""
        )

        system = (
            "You are a helpful productivity coach. "
            "Answer concisely with practical, action-oriented advice. "
            "If the question relates to tasks, use the provided context. "
            "Prefer bullet points and short paragraphs."
        )

        prompt_text = system
        if summary:
            prompt_text += "\n\n" + summary
        prompt_text += f"\n\nUser question: {req.prompt}"

        # inline call; no unused 'model' variable
        resp = genai.GenerativeModel("gemini-1.5-flash-latest").generate_content(prompt_text)
        text = (getattr(resp, "text", None) or "").strip()
        if not text:
            text = "I couldn’t generate a response. Try rephrasing?"
        return ChatRes(text=text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")
       
      
     
     
@app.get("/debug/models")
def debug_models():
    try:
        items = []
        for m in genai.list_models():
            items.append({
                "name": m.name,
                "methods": getattr(m, "supported_generation_methods", []),
            })
        return {"ok": True, "models": items}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/debug/gemini-ready")
def debug_gemini_ready():
    return {
        "GEMINI_READY": GEMINI_READY,
        "has_key": bool(GEMINI_API_KEY),
        "key_prefix": (GEMINI_API_KEY[:10] + "…") if GEMINI_API_KEY else None,
    }
    
    
    
    
# -------- Google Sign-in verification (optional) --------
class GoogleAuthReq(BaseModel):
    id_token: str

@app.post("/auth/google")
def auth_google(req: GoogleAuthReq):
    if not GOOGLE_READY:
        raise HTTPException(status_code=500, detail="google-auth not installed on server")
    try:
        info = id_token.verify_oauth2_token(
            req.id_token,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None,
        )
        user = {
            "email": info.get("email", ""),
            "name": info.get("name", ""),
            "picture": info.get("picture", ""),
            "sub": info.get("sub", ""),
        }
        return {"user": user}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Google token")
    
    