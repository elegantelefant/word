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

  it("saves the Terminal command's download into the wef folder", () => {
    expect(macSection).toContain(`-o ${WEF_FOLDER}/manifest.xml`);
  });

  it("says where Word on Mac lists a sideloaded add-in", () => {
    expect(macSection).toContain("**My Add-ins** → **Developer Add-ins**");
  });

  it("does not promise a Home > Open Elefant button after the script runs", () => {
    expect(macInstaller).not.toContain("Open Elefant");
  });

  it("saves into the wef folder and says where to find the add-in", () => {
    expect(macInstaller).toContain('WEF_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"');
    expect(macInstaller).toContain("My Add-ins > Developer Add-ins");
  });

  it("keeps the linked install guide off the double-click script", () => {
    const guide = read("agent_docs/2026-03-05-user-install-guide.md");
    const macOption = guide.slice(guide.indexOf("## Option B"), guide.indexOf("## Option C"));
    expect(macOption).not.toMatch(/install-mac\.command|Double-click|Open Elefant/);
  });
});
