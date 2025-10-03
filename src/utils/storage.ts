const KEY = "tm_tasks_v1";
export const loadTasks = <T,>(fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(KEY) || "") as T; }
  catch { return fallback; }
};
export const saveTasks = <T,>(data: T) => localStorage.setItem(KEY, JSON.stringify(data));