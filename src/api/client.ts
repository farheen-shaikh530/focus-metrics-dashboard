// src/api/client.ts
const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchTasks() {
  const res = await fetch(`${API}/tasks`);
  return res.json();
}

export async function createTask(task: any) {
  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function patchTask(id: string, patch: any) {
  const res = await fetch(`${API}/tasks/${id}`, {
    method: "PATCH",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(patch),
  });
  return res.json();
}