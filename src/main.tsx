import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./index.css";

import { SnackbarProvider } from "notistack";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={2200}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <App />
    </SnackbarProvider>
  </React.StrictMode>
);