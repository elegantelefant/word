// ABOUTME: Entry point of the Teams personal tab (teams.html): starts the Teams JS SDK, then mounts TeamsApp.
// ABOUTME: Office.js is never loaded here; outside Teams the tab still renders and signs in by browser popup.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TeamsApp } from "./TeamsApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { setClickOnlySignIn } from "./api/auth";
import { signInWithTeams, startTeams } from "./lib/teams";
import "./index.css";

void startTeams().then((inTeams) => {
  if (inTeams) setClickOnlySignIn(signInWithTeams);
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <TeamsApp />
      </ErrorBoundary>
    </StrictMode>,
  );
});
