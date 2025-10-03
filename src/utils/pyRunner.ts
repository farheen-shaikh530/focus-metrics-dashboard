import { loadPyodide, type PyodideInterface } from "pyodide";

let py: PyodideInterface | null = null;
export async function runPy(code: string, context: Record<string, any> = {}) {
  if (!py) py = await loadPyodide();
  Object.entries(context).forEach(([k,v]) => (py!.globals.set(k, v)));
  return py.runPython(code);
}