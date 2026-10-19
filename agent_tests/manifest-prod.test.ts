// ABOUTME: Tests the production Office Add-in manifest identity and listing URLs.
// ABOUTME: Keeps production metadata distinct from the local development manifest.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const productionManifest = readFileSync(
  resolve(process.cwd(), "manifest.prod.xml"),
  "utf8",
);
const developmentManifest = readFileSync(
  resolve(process.cwd(), "manifest.xml"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
);

const elementValue = (name: string, manifest: string) =>
  manifest.match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1];

const attributeValue = (element: string, attribute: string, manifest: string) =>
  manifest.match(
    new RegExp(`<${element}[^>]*${attribute}="([^"]+)"`),
  )?.[1];

describe("production manifest metadata", () => {
  it("uses the approved production identity and URLs", () => {
    const productionId = elementValue("Id", productionManifest);

    expect(productionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(productionId).not.toBe(elementValue("Id", developmentManifest));
    expect(elementValue("Version", productionManifest)).toBe("1.0.2.0");
    expect(elementValue("ProviderName", productionManifest)).toBe(
      "Elegant Elephant Pte Ltd",
    );
    expect(
      attributeValue("SupportUrl", "DefaultValue", productionManifest),
    ).toBe("https://elefant.legal/resources/support");
    expect(productionManifest).toContain(
      '<bt:Url id="GetStarted.LearnMoreUrl" DefaultValue="https://elefant.legal/integrations/word"',
    );
  });

  it("serves production resources from the stable host", () => {
    const origin = "https://addin.elefant.legal";
    expect(attributeValue("SourceLocation", "DefaultValue", productionManifest)).toBe(`${origin}/`);
    expect(productionManifest).toContain(`<bt:Url id="Taskpane.Url" DefaultValue="${origin}/"`);
    for (const file of ["manifest.prod.xml", "public/install-mac.command", "public/install-windows.bat", "README.md"]) {
      const contents = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(contents).not.toContain("elefant-word-245916757771");
      if (file.startsWith("public/")) {
        expect(contents).toContain(`MANIFEST_URL=${file.endsWith(".command") ? '"' : ''}${origin}/manifest.xml`);
      }
      if (file === "README.md") {
        for (const resource of ["manifest.xml", "install-mac.command", "install-windows.bat"]) {
          expect(contents).toContain(`${origin}/${resource}`);
        }
      }
    }
  });

  it("uses a semver package version", () => {
    expect(packageJson.version).toBe("0.1.0");
  });
});
