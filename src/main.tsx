// ABOUTME: Entry point — decides between the task pane app and the landing page.
// ABOUTME: Waits for Office.onReady inside Word; shows install steps in a browser.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LandingPage } from "./components/LandingPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const mount = (Component: typeof App | typeof LandingPage) => {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </StrictMode>,
  );
};

// Office.js loaded via CDN in index.html
if (typeof Office !== "undefined") {
  Office.onReady(() => mount(App));
} else if (import.meta.env.DEV) {
  // Dev browser: render the app so `pnpm dev` stays usable without sideloading.
  mount(App);
} else if (window.top !== window.self) {
  // Framed but Office.js missing — likely the CDN script failed inside Word.
  // Render the app rather than telling an installed user to install it.
  mount(App);
} else {
  // Someone opened the Cloud Run URL directly. The task pane can't work here,
  // so show install instructions instead of a UI that fails on first click.
  mount(LandingPage);
}
