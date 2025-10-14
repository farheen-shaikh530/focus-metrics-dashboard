import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// This service worker intercepts fetch/XHR calls in the browser during dev.
export const worker = setupWorker(...handlers);