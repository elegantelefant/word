// ABOUTME: Tests the downloadable installer scripts against the production manifest they install.
// ABOUTME: Reads the scripts as text: nothing here runs them on Windows or macOS.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const productionManifest = read("manifest.prod.xml");
const windowsInstaller = read("public/install-windows.bat");
const manifestId = productionManifest.match(/<Id>([^<]+)<\/Id>/)?.[1];

describe("Windows installer (#73)", () => {
  it("registers the manifest under the key Word reads sideloaded add-ins from at start", () => {
    expect(windowsInstaller).toMatch(/reg add "HKCU\\Software\\Microsoft\\Office\\16\.0\\WEF\\Developer"/);
  });

  it("names the registry entry with the production manifest's Id", () => {
    expect(windowsInstaller).toContain(`set ADDIN_ID=${manifestId}`);
  });

  it("keeps the manifest outside Office's Wef cache, which clearing the cache deletes", () => {
    expect(windowsInstaller).not.toMatch(/Office\\16\.0\\Wef(?!\\Developer)/i);
  });

  it("does not promise a Home > Open Elefant button", () => {
    expect(windowsInstaller).not.toContain("Open Elefant");
  });
});
