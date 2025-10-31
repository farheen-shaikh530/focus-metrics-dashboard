import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { useTasks } from "@/store/useTasks";

if (typeof window !== "undefined") {
  (window as any).useTasks = useTasks;
  console.log("✅ useTasks exposed to window — you can now test in DevTools.");
}

// ⬇️ Start MSW only in dev (and optionally when a flag is set)
async function enableMocking() {
  // If you want a toggle: set VITE_USE_MOCKS=true in .env.development
  const useMocks =
    import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== "false";

  if (!useMocks) return;

  const { worker } = await import("./mocks/browser");
  await worker.start({
    // If your API lives on another origin, list it here or use a regex in handlers.
    // serviceWorker: { url: "/mockServiceWorker.js" }, // default is fine with Vite public/
    onUnhandledRequest: "bypass", // don't spam the console for unknown routes
  });

  console.info("[MSW] Mocking enabled");
}

enableMocking().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});