# server/app.py
from __future__ import annotations

import os, re, time, json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple, Optional, Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import timezone


# ───────────────────────────── Env ─────────────────────────────
env_here = Path(__file__).with_name(".env")
if env_here.exists():
    load_dotenv(env_here)      # server/.env
load_dotenv()                  # project root .env

GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID", "").strip()
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "").strip()
W2W_ICS_URL      = os.getenv("W2W_ICS_URL", "").strip()
GCAL_ICS_URL     = os.getenv("GCAL_ICS_URL", "").strip()

# ───────────────────────────── Optional deps ─────────────────────────────
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_READY = True
except Exception:
    GOOGLE_READY = False

try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        GEMINI_READY = True
    else:
        GEMINI_READY = False
except Exception:
    GENMI_READY = False
    genai = None  # type: ignore

def pick_model() -> str:
    return "models/gemini-2.5-flash"

# ───────────────────────────── App & CORS ─────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.15.150.131:5173",  # optional: your LAN IP if you use it
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────────────────── Task models ─────────────────────────────
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

# ───────────────────────────── Health ─────────────────────────────
@app.get("/")
def home():
    return {"message": "Hello from FastAPI 🚀"}

# ───────────────────────────── ICS helpers ─────────────────────────────
ISO_RE = re.compile(r"^(\d{8})T(\d{6})Z?$")

def _ics_time_to_iso(v: str) -> str:
    m = ISO_RE.match(v.strip())
    if not m:
        return v
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
            if {"DTSTART", "DTEND", "SUMMARY"} <= block.keys():
                events.append({
                    "id": block.get("UID") or str(hash(block["SUMMARY"] + block["DTSTART"])),
                    "title": block["SUMMARY"],
                    "start": _ics_time_to_iso(block["DTSTART"]),
                    "end": _ics_time_to_iso(block["DTEND"]),
                    "location": block.get("LOCATION", ""),
                    "raw": {"description": block.get("DESCRIPTION", "")},
                })
        i += 1
    return events

def _check_ics(url: str) -> tuple[bool, str | None]:
    if not url:
        return False, "ICS URL not configured."
    try:
        r = requests.get(url, timeout=12)
        r.raise_for_status()
        t = r.text or ""
        if "BEGIN:VCALENDAR" in t and "BEGIN:VEVENT" in t:
            return True, None
        return False, "ICS feed does not look valid."
    except Exception as e:
        return False, f"Fetch failed: {e}"

# ───────────────────────────── Integration status (single endpoint) ─────────────────────────────
_INTEGRATION_CACHE = {"at": 0.0, "data": None}
_CACHE_TTL_SEC = 300

@app.get("/integrations/status")
def integrations_status(email: str = Query(..., description="Signed-in user email")):
    now = time.time()
    if _INTEGRATION_CACHE["data"] and (now - _INTEGRATION_CACHE["at"] < _CACHE_TTL_SEC):
        return _INTEGRATION_CACHE["data"]

    has_w2w, w2w_reason   = _check_ics(W2W_ICS_URL)
    has_gcal, gcal_reason = _check_ics(GCAL_ICS_URL)

    payload = {
        "email": email,
        "hasW2W": has_w2w,   "w2wReason": w2w_reason,
        "hasGCal": has_gcal, "gcalReason": gcal_reason,
    }
    _INTEGRATION_CACHE["data"] = payload
    _INTEGRATION_CACHE["at"] = now
    return payload

# ───────────────────────────── W2W + GCal endpoints ─────────────────────────────
W2W_CACHE: dict = {"at": None, "items": []}
GCAL_CACHE: dict = {"at": None, "items": []}

@app.get("/w2w/shifts")
def w2w_shifts(days: int = Query(14, ge=1, le=60), upcoming: bool = False):
    if not W2W_ICS_URL:
        raise HTTPException(500, "W2W_ICS_URL is not set in .env")
    now = datetime.now(timezone.utc)
    if not W2W_CACHE["at"] or (now - W2W_CACHE["at"]).total_seconds() > 900:
        try:
            txt = requests.get(W2W_ICS_URL, timeout=20).text
            W2W_CACHE["items"] = parse_ics_events(txt)
            W2W_CACHE["at"] = now
        except Exception as e:
            raise HTTPException(502, f"W2W fetch failed: {e}")
    items = list(W2W_CACHE["items"])
    if upcoming:
        items = [s for s in items if datetime.fromisoformat(s["end"]) > now]
    end_limit = now + timedelta(days=days)
    items = [s for s in items if datetime.fromisoformat(s["start"]) <= end_limit]
    return {"items": items, "cachedAt": now.isoformat()}

@app.post("/w2w/sync-to-tasks")
def w2w_sync_to_tasks():
    items = W2W_CACHE["items"] or []
    created = updated = 0
    for ev in items:
        eid = f"w2w-{ev['id']}"
        title = f"Shift: {ev['title']}{(' @ ' + ev['location']) if ev.get('location') else ''}"
        existing = DB.get(eid)
        base = dict(
            id=eid, title=title, description=(ev.get("raw", {}).get("description") or "").strip(),
            priority="medium", status="todo",
            createdAt=ev["start"], updatedAt=ev["start"], dueDate=ev["end"],
            externalId=eid, source="w2w"
        )
        if existing:
            DB[eid] = Task(**{**existing.model_dump(), **base, "updatedAt": datetime.utcnow().isoformat()})
            updated += 1
        else:
            DB[eid] = Task(**base); created += 1
    return {"created": created, "updated": updated}

@app.get("/gcal/shifts")
def gcal_shifts(days: int = Query(14, ge=1, le=60), upcoming: bool = False):
    if not GCAL_ICS_URL:
        raise HTTPException(500, "GCAL_ICS_URL is not set in .env")
    now = datetime.now(timezone.utc)
    if not GCAL_CACHE["at"] or (now - GCAL_CACHE["at"]).total_seconds() > 900:
        try:
            txt = requests.get(GCAL_ICS_URL, timeout=20).text
            GCAL_CACHE["items"] = parse_ics_events(txt)
            GCAL_CACHE["at"] = now
        except Exception as e:
            raise HTTPException(502, f"GCAL fetch failed: {e}")
    items = list(GCAL_CACHE["items"])
    if upcoming:
        items = [s for s in items if datetime.fromisoformat(s["end"]) > now]
    end_limit = now + timedelta(days=days)
    items = [s for s in items if datetime.fromisoformat(s["start"]) <= end_limit]
    return {"items": items, "cachedAt": now.isoformat()}

@app.post("/gcal/sync-to-tasks")
def gcal_sync_to_tasks():
    items = GCAL_CACHE["items"] or []
    now_iso = datetime.utcnow().isoformat()
    created = updated = 0
    for ev in items:
        if ev["end"] < now_iso:
            continue
        eid = f"gcal-{ev['id']}"
        title = f"Calendar: {ev['title']}{(' @ ' + ev['location']) if ev.get('location') else ''}"
        existing = DB.get(eid)
        base = dict(
            id=eid, title=title, description=(ev.get("raw", {}).get("description") or "").strip(),
            priority="medium", status="todo",
            createdAt=ev["start"], updatedAt=ev["start"], dueDate=ev["end"],
            externalId=eid, source="gcal"
        )
        if existing:
            DB[eid] = Task(**{**existing.model_dump(), **base, "updatedAt": datetime.utcnow().isoformat()})
            updated += 1
        else:
            DB[eid] = Task(**base); created += 1
    return {"created": created, "updated": updated}

# ───────────────────────────── Tasks API ─────────────────────────────
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
        raise HTTPException(404, "not found")
    data = t.model_dump()
    data.update({k: v for k, v in patch.model_dump(exclude_unset=True).items()})
    data["updatedAt"] = datetime.utcnow().isoformat()
    DB[task_id] = Task(**data)
    return DB[task_id]


# ───────────────────────────── Google Auth (optional) ─────────────────────────────
class GoogleAuthReq(BaseModel):
    id_token: str

@app.post("/auth/google")
def auth_google(req: GoogleAuthReq):
    if not GOOGLE_READY:
        raise HTTPException(500, "google-auth not installed on server")
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
        raise HTTPException(400, "Invalid Google token")
   


@app.get("/metrics/weekly")
def metrics_weekly():
    """
    Compute simple weekly metrics from the in-memory DB:
    - how many tasks were completed this week
    - average cycle time (ms) for those completed tasks
    - on-time % (completed before or on dueDate)
    Returns arrays so the frontend can chart by week.
    """
    now = datetime.now(timezone.utc)

    # Week window: Monday 00:00:00 -> next Monday 00:00:00 (UTC)
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end = week_start + timedelta(days=7)

    def as_aware(dt_str: str | None) -> datetime | None:
        if not dt_str:
            return None
        # tolerate naive ISO by assuming UTC
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    # Completed within this week
    done = []
    for t in DB.values():
        if t.status != "done":
            continue
        upd = as_aware(t.updatedAt)
        if not upd or upd < week_start or upd >= week_end:
            continue
        done.append(t)

    # Avg cycle time for completed (updated - created)
    cycles_ms: list[int] = []
    for t in done:
        created = as_aware(t.createdAt)
        updated = as_aware(t.updatedAt)
        if created and updated:
            ms = int((updated - created).total_seconds() * 1000)
            if ms >= 0:
                cycles_ms.append(ms)

    avg_cycle_ms = int(sum(cycles_ms) / len(cycles_ms)) if cycles_ms else 0

    # On-time: completed <= dueDate (only for tasks that have dueDate)
    with_due = [t for t in done if t.dueDate]
    on_time = 0
    for t in with_due:
        updated = as_aware(t.updatedAt)
        due = as_aware(t.dueDate)
        if updated and due and updated <= due:
            on_time += 1
    on_time_pct = round((on_time / len(with_due)) * 100) if with_due else 0

    wk = week_start.date().isoformat()
    return {
        "weeklyDone":  [{"weekStart": wk, "count": len(done)}],
        "weeklyCycle": [{"weekStart": wk, "avgCycleMs": avg_cycle_ms}],
        "weeklyOnTime": [{"weekStart": wk, "onTimePct": on_time_pct}],
    }
    