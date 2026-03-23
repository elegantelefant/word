// ABOUTME: Entry point — waits for Office.onReady then mounts React app.
// ABOUTME: Falls back to direct mount when running outside Office (dev/test).

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { markOfficeReady } from "./lib/office";
import "./index.css";

const mount = () => {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
};

// Office.js loaded via CDN in index.html
if (typeof Office !== "undefined") {
  Office.onReady(() => {
    markOfficeReady();
    mount();
  });
} else {
  // Running outside Office (dev browser, tests)
  mount();
}
