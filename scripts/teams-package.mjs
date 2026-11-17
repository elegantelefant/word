#!/usr/bin/env node
// ABOUTME: Builds the Microsoft Teams app package (manifest.json + two icons, zipped) for the Elefant personal tab.
// ABOUTME: `pnpm teams:package` writes teams/dist/elefant-teams-<version>.zip; origins come from env (see below).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { zipSync, strToU8 } from "fflate";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Teams manifest schema version: the newest "generally available" one listed at
// https://learn.microsoft.com/en-us/microsoft-365/extensibility/schema/ on 17 Nov 2026.
const MANIFEST_VERSION = "1.29";

// The Teams app's own id. Not an Entra app id: it only has to stay the same across versions,
// so admin centres treat a new upload as an update of this app.
const TEAMS_APP_ID = "2dbad42e-3e7e-439c-b8a1-5bcb9e9162df";

// Where the tab is served (the same nginx origin as the Word task pane) and where Elefant
// signs users in. Override for a localhost sideload: TEAMS_TAB_ORIGIN=https://localhost:3000.
const DEFAULT_TAB_ORIGIN = "https://addin.elefant.legal";
const DEFAULT_API_ORIGIN = "https://elefant.legal";

const ACCENT_COLOR = "#2563EB";

/** The manifest.json Teams reads; name and description are PROPOSED wording (agent_docs/2026-11-17-teams-app.md). */
export function teamsManifest({ version, tabOrigin, apiOrigin }) {
  return {
    $schema: `https://developer.microsoft.com/json-schemas/teams/v${MANIFEST_VERSION}/MicrosoftTeams.schema.json`,
    manifestVersion: MANIFEST_VERSION,
    version,
    id: TEAMS_APP_ID,
    developer: {
      name: "Elegant Elephant Pte Ltd",
      websiteUrl: "https://elefant.legal",
      privacyUrl: "https://elefant.legal/privacy-policy",
      termsOfUseUrl: "https://elefant.legal/terms-and-condition",
    },
    name: { short: "Elefant", full: "Elefant Legal Assistant" },
    description: {
      short: "AI-powered legal document review and analysis",
      full: "Paste contract text into Elefant and get a summary and the issues worth a lawyer's attention. Use your own Gemini API key, or sign in with an Elefant account.",
    },
    icons: { color: "color.png", outline: "outline.png" },
    accentColor: ACCENT_COLOR,
    staticTabs: [
      { entityId: "review", name: "Review", contentUrl: `${tabOrigin}/teams.html`, scopes: ["personal"] },
    ],
    validDomains: [new URL(tabOrigin).host, new URL(apiOrigin).host],
  };
}

/** The .zip uploaded to Teams: manifest and icons at the root, nothing else. */
export function teamsPackage(options) {
  return zipSync({
    "manifest.json": strToU8(JSON.stringify(teamsManifest(options), null, 2)),
    "color.png": readFileSync(join(ROOT, "teams/color.png")),
    "outline.png": readFileSync(join(ROOT, "teams/outline.png")),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  const options = {
    version,
    tabOrigin: process.env.TEAMS_TAB_ORIGIN ?? DEFAULT_TAB_ORIGIN,
    apiOrigin: process.env.TEAMS_API_ORIGIN ?? DEFAULT_API_ORIGIN,
  };
  const outDir = join(ROOT, "teams/dist");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `elefant-teams-${version}.zip`);
  writeFileSync(out, teamsPackage(options));
  console.log(`Wrote ${out} (tab ${options.tabOrigin}, sign-in ${options.apiOrigin})`);
}
