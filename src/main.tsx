// ABOUTME: Entry point — decides between the task pane app and the landing page.
// ABOUTME: Waits for Office.onReady inside Word; shows install steps in a browser.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LandingPage } from "./components/LandingPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { chooseComponent } from "./lib/mount-decision";
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

// Office.js is loaded from the CDN in index.html, so `typeof Office` is defined
// in a plain browser tab too — and onReady fires there with host null. The host
// is what actually distinguishes a task pane from someone opening the URL.
if (typeof Office !== "undefined") {
  Office.onReady((info: { host: unknown; platform: unknown }) => {
    mount(chooseComponent(info.host, import.meta.env.DEV) === "app" ? App : LandingPage);
  });
} else {
  // Office.js failed to load. Inside Word that's a CDN problem, not a reason to
  // tell an installed user to install it, so render the app.
  mount(App);
}
