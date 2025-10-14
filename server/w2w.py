# server/w2w.py
import os, datetime as dt
import requests
from typing import List, Dict, Any

W2W_BASE = os.getenv("W2W_BASE_URL", "https://api.when2work.example")  # <-- replace
W2W_API_KEY = os.getenv("W2W_API_KEY", "")
W2W_ACCOUNT_ID = os.getenv("W2W_ACCOUNT_ID", "")

def _hdrs():
    return {
        "Authorization": f"Bearer {W2W_API_KEY}",
        "Accept": "application/json",
    }

def fetch_shifts(start: str, end: str) -> List[Dict[str, Any]]:
    """
    start/end: ISO date (YYYY-MM-DD). Adjust to match W2W API spec.
    """
    url = f"{W2W_BASE}/v1/accounts/{W2W_ACCOUNT_ID}/shifts?start={start}&end={end}"
    r = requests.get(url, headers=_hdrs(), timeout=20)
    r.raise_for_status()
    data = r.json()
    # normalize to your shape
    shifts = []
    for s in data.get("shifts", []):
        shifts.append({
            "id": str(s["id"]),
            "role": s.get("positionName") or s.get("role", "Shift"),
            "location": s.get("locationName") or s.get("location", ""),
            "start": s["start"],  # ISO
            "end": s["end"],      # ISO
            "notes": s.get("notes", ""),
        })
    return shifts