// ABOUTME: Tests for the Teams app package: the manifest it carries and the zip Teams uploads.
// ABOUTME: Reads the real icons and unzips the real package; nothing is mocked.
// @vitest-environment node

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { teamsManifest, teamsPackage } from "../scripts/teams-package.mjs";

const ORIGINS = { tabOrigin: "https://addin.example.test" };

function pngSize(bytes: Uint8Array): { width: number; height: number; colorType: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // IHDR is the first chunk: width at byte 16, height at 20, colour type at 25.
  return { width: view.getUint32(16), height: view.getUint32(20), colorType: bytes[25]! };
}

describe("teamsManifest", () => {
  const manifest = teamsManifest({ version: "1.2.3", ...ORIGINS });

  it("opens one personal tab on the task pane's own origin", () => {
    expect(manifest.staticTabs).toEqual([
      expect.objectContaining({ contentUrl: "https://addin.example.test/teams.html", scopes: ["personal"] }),
    ]);
  });

  it("lists the tab host and Elefant's sign-in host as valid domains so the sign-in popup can run on both", () => {
    expect(manifest.validDomains).toEqual(["addin.example.test", "elefant.legal"]);
  });

  it("carries the version it is given", () => {
    expect(manifest.version).toBe("1.2.3");
  });

  it("uses manifest version 1.29, the newest generally available schema, and declares that schema", () => {
    expect([manifest.manifestVersion, manifest.$schema]).toEqual([
      "1.29",
      "https://developer.microsoft.com/json-schemas/teams/v1.29/MicrosoftTeams.schema.json",
    ]);
  });
});

describe("teamsPackage", () => {
  const files = unzipSync(teamsPackage({ version: "1.2.3", ...ORIGINS }));

  it("puts exactly the manifest and both icons at the zip root", () => {
    expect(Object.keys(files).sort()).toEqual(["color.png", "manifest.json", "outline.png"]);
  });

  it("zips the same manifest teamsManifest builds", () => {
    expect(JSON.parse(strFromU8(files["manifest.json"]!))).toEqual(
      teamsManifest({ version: "1.2.3", ...ORIGINS }),
    );
  });
});

describe("Teams icons", () => {
  it("has a 192 x 192 colour icon", () => {
    const { width, height } = pngSize(readFileSync("teams/color.png"));
    expect({ width, height }).toEqual({ width: 192, height: 192 });
  });

  it("has a 32 x 32 outline icon with an alpha channel", () => {
    expect(pngSize(readFileSync("teams/outline.png"))).toEqual({ width: 32, height: 32, colorType: 6 });
  });
});
