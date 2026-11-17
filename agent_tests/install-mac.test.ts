// ABOUTME: Tests the macOS install path the README gives against the folder Word on Mac sideloads from.
// ABOUTME: Reads README.md and the script as text: nothing here runs them on macOS.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const readme = read("README.md");
const macSection = readme.slice(readme.indexOf("### macOS desktop"), readme.indexOf("For detailed platform-specific"));
const macInstaller = read("public/install-mac.command");
const WEF_FOLDER = "~/Library/Containers/com.microsoft.Word/Data/Documents/wef";

describe("macOS install (#74)", () => {
  it("does not send users to double-click a downloaded script, which macOS refuses to run", () => {
    expect(macSection).not.toContain("install-mac.command");
  });

  it("gives the wef folder Word on Mac sideloads from", () => {
    expect(macSection).toContain(WEF_FOLDER);
  });

  it("gives the production manifest to copy there", () => {
    expect(macSection).toContain("https://addin.elefant.legal/manifest.xml");
  });

  it("does not promise a Home > Open Elefant button after the script runs", () => {
    expect(macInstaller).not.toContain("Open Elefant");
  });
});
