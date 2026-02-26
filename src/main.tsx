// ABOUTME: Entry point — waits for Office.onReady then mounts React app.
// ABOUTME: Falls back to direct mount when running outside Office (dev/test).

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const mount = () => {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// Office.js loaded via CDN in index.html
if (typeof Office !== "undefined") {
  Office.onReady(() => mount());
} else {
  // Running outside Office (dev browser, tests)
  mount();
}
