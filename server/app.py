# server/app.py
from __future__ import annotations

import os
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple, Optional, Literal
import json
from pathlib import Path
from fastapi import Body

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi import Query


DATA_DIR = Path(__file__).with_suffix("").parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
W2W_FILE = DATA_DIR / "w2w_links.json"
GCAL_ICS_URL = os.getenv("GCAL_ICS_URL")
_INTEGRATION_CACHE = {"at": 0.0, "data": None}
_CACHE_TTL_SEC = 300  


def _load_links() -> dict[str, str]:
    if W2W_FILE.exists():
        try:
            return json.loads(W2W_FILE.read_text())
        except Exception:
            return {}
    return {}

def _save_links(d: dict[str, str]) -> None:
    W2W_FILE.write_text(json.dumps(d, indent=2))



# ──────────────────────────────────────────────────────────────────────────────
# Env
# ──────────────────────────────────────────────────────────────────────────────
env_here = Path(__file__).with_name(".env")
if env_here.exists():
    load_dotenv(env_here)  # server/.env
load_dotenv()               # fallback: project root .env

GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")
W2W_ICS_URL = os.getenv("W2W_ICS_URL", "")

# ──────────────────────────────────────────────────────────────────────────────
# Optional Google Sign-In
# ──────────────────────────────────────────────────────────────────────────────
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_READY = True
except Exception:
    GOOGLE_READY = False

# ──────────────────────────────────────────────────────────────────────────────
# Optional Gemini
# ──────────────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
try:
    import google.generativeai as genai
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY")
    genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_READY = True
except Exception:
    GEMINI_READY = False
    genai = None  # type: ignore

def pick_model() -> str:
    if not GEMINI_READY:
        return "models/gemini-2.5-flash"
    preferred = [
        "models/gemini-2.5-flash",
        "models/gemini-2.5-pro",
        "models/gemini-flash-latest",
        "models/gemini-pro-latest",
    ]
    try:
        models = list(genai.list_models())  # type: ignore
        usable = {
            m.name
            for m in models
            if "generateContent" in getattr(m, "supported_generation_methods", [])
        }
        for want in preferred:
            if want in usable:
                return want
        return next(iter(usable))
    except Exception:
        return "models/gemini-2.5-flash"

# ──────────────────────────────────────────────────────────────────────────────
# FastAPI + CORS
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# Domain models (Tasks)
# ──────────────────────────────────────────────────────────────────────────────
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
    # optional external fields (for integrations)
    externalId: Optional[str] = None
    source: Optional[str] = None

class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    dueDate: Optional[str] = None
    estimateMinutes: Optional[int] = None
    timeSpentMs: Optional[int] = None
    timerStartedAt: Optional[str] = None

DB: dict[str, Task] = {}

# ──────────────────────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────────────────────
def _verify_ics(url: str) -> tuple[bool, str]:
    """Try downloading & parsing ICS. Return (ok, reason)."""
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        events = parse_ics_events(r.text)
        if not events:
            return False, "ICS parsed but had no events"
        return True, "OK"
    except Exception as e:
        return False, f"Fetch/parse failed: {e}"


# ---------- Integrations status ----------
@app.get("/integrations/status")
def integrations_status(email: str):
    """Return whether this email has a saved ICS link (works for any login method)."""
    links = _load_links()
    ics = links.get(email.lower())
    if not ics:
        return {"hasW2W": False, "reason": "No ICS URL on file"}
    ok, reason = _verify_ics(ics)
    return {"hasW2W": bool(ok), "reason": None if ok else reason, "icsUrl": ics}

class ConnectReq(BaseModel):
    email: str
    icsUrl: str

@app.post("/integrations/w2w/connect")
def integrations_connect(req: ConnectReq):
    """Save an ICS link for this email after verifying it can be fetched/parsed."""
    ok, reason = _verify_ics(req.icsUrl)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Invalid ICS: {reason}")
    links = _load_links()
    links[req.email.lower()] = req.icsUrl
    _save_links(links)
    return {"ok": True}

@app.get("/")
def home():
    return {"message": "Hello from FastAPI 🚀"}

# ──────────────────────────────────────────────────────────────────────────────
# Tasks API
# ──────────────────────────────────────────────────────────────────────────────
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
    data.update({k: v for k, v in patch.model_dump(exclude_unset=True).items()})
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

# ──────────────────────────────────────────────────────────────────────────────
# Chat + Retro
# ──────────────────────────────────────────────────────────────────────────────
class ChatReq(BaseModel):
    prompt: str
    tasks: Optional[list[dict]] = None

class ChatRes(BaseModel):
    text: str

@app.post("/chat", response_model=ChatRes)
def chat(req: ChatReq):
    if not GEMINI_READY:
        q = req.prompt.lower()
        if req.tasks and "longer" in q and "task" in q:
            longest = max(req.tasks, key=lambda t: t.get("timeSpentMs", 0), default=None)
            if longest:
                hours = round((longest.get("timeSpentMs", 0) or 0) / 3_600_000, 2)
                return ChatRes(text=f"‘{longest.get('title','(untitled)')}’ has the most time logged: ~{hours}h.")
        return ChatRes(text="I can’t reach Gemini right now. Try a 25-minute timebox on your next task.")

    try:
        summary = ""
        if req.tasks:
            lines = [
                f"- {t.get('title','(untitled)')} | status={t.get('status')} | spent={t.get('timeSpentMs',0)}ms | created={t.get('createdAt')}"
                for t in req.tasks[:50]
            ]
            if lines:
                summary = "Here are the user's recent tasks:\n" + "\n".join(lines)

        system = (
            "You are a helpful productivity coach. "
            "Answer concisely with practical, action-oriented advice. "
            "Use provided task context when relevant. Prefer bullets."
        )
        prompt_text = system + ("\n\n" + summary if summary else "") + f"\n\nUser question: {req.prompt}"
        model = genai.GenerativeModel(pick_model())  # type: ignore
        resp = model.generate_content(prompt_text)   # type: ignore
        text = (getattr(resp, "text", None) or "").strip()
        return ChatRes(text=text or "I couldn’t generate a response. Try rephrasing?")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")

class RetroReq(BaseModel):
    week_start_iso: Optional[str] = None

class RetroRes(BaseModel):
    text: str

@app.post("/retro", response_model=RetroRes)
def retro(_: RetroReq):
    try:
        done = [t for t in DB.values() if t.status == "done"]
        created = len(DB)
        cycles = []
        for t in done:
            try:
                cycles.append(
                    (datetime.fromisoformat(t.updatedAt) - datetime.fromisoformat(t.createdAt)).total_seconds()/3600
                )
            except Exception:
                pass
        avg_cycle = round(sum(cycles)/len(cycles), 2) if cycles else 0
        context = f"Total tasks: {created} • Completed: {len(done)} • Avg cycle time (hrs): {avg_cycle}"

        if not GEMINI_READY:
            return RetroRes(text=f"Weekly retro: {context}. Try focusing on small batch sizes next week.")

        model = genai.GenerativeModel(pick_model())  # type: ignore
        prompt = (
            "You are a concise productivity coach. Using the metrics below, write a brief, friendly weekly retrospective "
            "with 3 bullet recommendations tailored to the data. Keep it under 120 words.\n\n"
            f"Metrics: {context}"
        )
        resp = model.generate_content(prompt)  # type: ignore
        text = (getattr(resp, "text", None) or "").strip() or f"Weekly retro: {context}"
        return RetroRes(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retro error: {e}")

# ──────────────────────────────────────────────────────────────────────────────
# WhenToWork via ICS (Google Calendar secret .ics)
# ──────────────────────────────────────────────────────────────────────────────

# ---- env
env_here = Path(__file__).with_name(".env")
if env_here.exists(): load_dotenv(env_here)
load_dotenv()
W2W_ICS_URL = os.getenv("W2W_ICS_URL")  # 👈 your Google “Secret address in iCal format”
W2W_CACHE: dict = {"at": None, "items": []}

ISO_RE = re.compile(r"^(\d{8})T(\d{6})Z?$")

def _ics_time_to_iso(v: str) -> str:
    m = ISO_RE.match(v.strip())
    if not m: return v
    date, clock = m.groups()
    dt = datetime.strptime(date + clock, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    return dt.isoformat()

def parse_ics_events(ics_text: str) -> List[Dict]:
    events: List[Dict] = []
    lines = [ln.rstrip("\r") for ln in ics_text.splitlines()]
    i, n = 0, len(lines)
    while i < n:
        if lines[i].startswith("BEGIN:VEVENT"):
            block: Dict[str, str] = {}
            i += 1
            while i < n and not lines[i].startswith("END:VEVENT"):
                ln = lines[i]
                while i + 1 < n and lines[i + 1].startswith(" "):
                    ln += lines[i + 1][1:]; i += 1
                if ":" in ln:
                    k, v = ln.split(":", 1)
                    k = k.split(";")[0].upper()
                    block[k] = v
                i += 1
            if {"DTSTART","DTEND","SUMMARY"} <= block.keys():
                events.append({
                    "id": block.get("UID") or str(hash(block["SUMMARY"]+block["DTSTART"])),
                    "title": block["SUMMARY"],
                    "start": _ics_time_to_iso(block["DTSTART"]),
                    "end": _ics_time_to_iso(block["DTEND"]),
                    "location": block.get("LOCATION",""),
                })
        i += 1
    return events

def fetch_shifts_from_ics(url: str) -> List[Dict]:
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    return parse_ics_events(r.text)


# ... CORS, other routes ...

@app.get("/w2w/shifts")
def w2w_shifts(
    days: int = Query(14, ge=1, le=60),
    upcoming: bool = Query(False)
):
    """
    Returns shifts from ICS; caches for 15 min.
    """
    if not W2W_ICS_URL:
        raise HTTPException(status_code=500, detail="W2W_ICS_URL is not set in .env")

    now = datetime.now(timezone.utc)
    # refresh cache
    if not W2W_CACHE["at"] or (now - W2W_CACHE["at"]).total_seconds() > 900:
        try:
            items = fetch_shifts_from_ics(W2W_ICS_URL)
            W2W_CACHE["items"] = items
            W2W_CACHE["at"] = now
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"W2W fetch failed: {e}")

    items = list(W2W_CACHE["items"])
    # optional: filter upcoming
    if upcoming:
        items = [s for s in items if datetime.fromisoformat(s["end"]) > now]

    # optional: limit the window
    end_limit = now + timedelta(days=days)
    items = [s for s in items if datetime.fromisoformat(s["start"]) <= end_limit]

    return {"items": items, "cachedAt": now.isoformat()}

# --- Integrations status (W2W) ---

@app.get("/integrations/status")
def integrations_status(email: str = Query(..., description="Signed-in user email")):
    w2w_url  = os.getenv("W2W_ICS_URL", "").strip()
    gcal_url = os.getenv("GCAL_ICS_URL", "").strip()

    def probe(url: str) -> tuple[bool, str | None]:
        if not url:
            return False, "Missing ICS URL in server .env"
        try:
            r = requests.get(url, timeout=12)
            r.raise_for_status()
            txt = r.text
            if "BEGIN:VCALENDAR" in txt and "BEGIN:VEVENT" in txt:
                # NOTE: some feeds won't contain email; don't hard-require it
                return True, None
            return False, "ICS feed does not look valid"
        except Exception as e:
            return False, f"Fetch error: {e}"

    hasW2W, w2wReason   = probe(w2w_url)
    hasGCal, gcalReason = probe(gcal_url)

    return {
        "email": email,
        "hasW2W": hasW2W,
        "w2wReason": w2wReason,
        "hasGCal": hasGCal,
        "gcalReason": gcalReason,
    }
      
# --- Integrations status (Google Calendar) ---
def _check_ics(url: str, want_email: str | None = None) -> tuple[bool, str | None]:
    """
    Validate an ICS feed quickly. If want_email is provided, we do a soft check
    (don't fail if it's missing; many feeds omit owner email).
    """
    if not url:
        return False, "No ICS URL configured."
    try:
        r = requests.get(url, timeout=12)
        r.raise_for_status()
        text = r.text or ""
        if "BEGIN:VCALENDAR" not in text or "BEGIN:VEVENT" not in text:
            return False, "ICS feed does not look valid."
        if want_email and want_email.lower() in text.lower():
            return True, None
        # Soft pass even if email isn't present
        return True, None
    except Exception as e:
        return False, f"Failed to fetch ICS: {e}"

@app.get("/integrations/status")
def integrations_status(email: str = Query(..., description="Signed-in user email")):
    """
    Returns availability of WhenToWork & Google Calendar imports
    based on configured ICS feeds.
    """
    now = time.time()
    if _INTEGRATION_CACHE["data"] and (now - _INTEGRATION_CACHE["at"] < _CACHE_TTL_SEC):
        return _INTEGRATION_CACHE["data"]

    w2w_url  = os.getenv("W2W_ICS_URL", "").strip()
    gcal_url = os.getenv("GCAL_ICS_URL", "").strip()  # <-- add this to your .env (frontend doesn't see it)

    has_w2w, w2w_reason   = _check_ics(w2w_url, want_email=email)
    has_gcal, gcal_reason = _check_ics(gcal_url, want_email=email)

    payload = {
        "hasW2W": has_w2w,
        "w2wReason": w2w_reason,
        "hasGCal": has_gcal,
        "gcalReason": gcal_reason,
    }
    _INTEGRATION_CACHE["data"] = payload
    _INTEGRATION_CACHE["at"] = now
    return payload


@app.post("/gcal/sync-to-tasks")
def gcal_sync_to_tasks():
    """
    Pull events from Google Calendar ICS (secret address) and create/update tasks.
    Only imports future or ongoing events (>= now).
    """
    if not GCAL_ICS_URL:
        raise HTTPException(status_code=500, detail="GCAL_ICS_URL is not set in .env")

    try:
        items, _ = fetch_shifts_from_ics(GCAL_ICS_URL)

        now = datetime.utcnow().isoformat()
        created, updated = 0, 0
        for ev in items:
            # Skip past events
            if ev["end"] < now:
                continue

            # Build a consistent external id
            eid = f"gcal-{ev['id']}"
            title = ev["title"] or "Calendar event"
            shift_title = f"{title}{(' @ ' + ev.get('location','').strip()) if ev.get('location') else ''}"

            # Find existing task by externalId (if your Task model doesn’t have it,
            # we just match by id key and keep the rest minimal)
            existing = next((t for t in DB.values() if getattr(t, "externalId", None) == eid), None)

            base = {
                "title": shift_title,
                "description": (ev.get("raw", {}).get("description") or "").strip(),
                "priority": "medium",
                "status": "todo",
                "createdAt": ev["start"],
                "updatedAt": ev["start"],
                "dueDate": ev["end"],
            }

            if existing:
                data = existing.model_dump()
                data.update({
                    "title": base["title"],
                    "description": base["description"],
                    "dueDate": base["dueDate"],
                    "updatedAt": datetime.utcnow().isoformat(),
                })
                DB[existing.id] = Task(**data)
                updated += 1
            else:
                tid = eid  # stable id
                DB[tid] = Task(id=tid, **base)
                # If you want to persist externalId/source, extend your Task model to include them.
                created += 1

        return {"created": created, "updated": updated}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"GCAL fetch failed: {e}")
   

# ──────────────────────────────────────────────────────────────────────────────
# Google Auth (optional)
# ──────────────────────────────────────────────────────────────────────────────
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
            audience=GOOGLE_CLIENT_ID or None,
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