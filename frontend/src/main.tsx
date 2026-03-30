import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import ErrorBoundary from "./utils/ErrorBoundary";
import { initHashNavigation } from "./state/appStore";

// Inisialisasi hash navigation sebelum render
// agar state & URL sudah sinkron sejak awal
initHashNavigation();

ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
