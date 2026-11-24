// ABOUTME: Tests the production Outlook manifest: its own identity, the stable host, and the image that ships it.
// ABOUTME: Mirrors manifest-prod.test.ts for the Word add-in.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), name), "utf8");
const outlookProd = read("manifest.outlook.prod.xml");
const id = (manifest: string) => manifest.match(/<Id>([^<]+)<\/Id>/)?.[1];
const elementValue = (name: string, manifest: string) =>
  manifest.match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1];
const supportUrl = (manifest: string) => manifest.match(/<SupportUrl DefaultValue="([^"]+)"/)?.[1];

describe("production Outlook manifest", () => {
  it("has a GUID id distinct from the dev Outlook and both Word manifests", () => {
    const others = ["manifest.outlook.xml", "manifest.xml", "manifest.prod.xml"].map((name) => id(read(name)));
    expect(id(outlookProd)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(others).not.toContain(id(outlookProd));
  });

  it("starts at version 1.0.0.0", () => {
    expect(elementValue("Version", outlookProd)).toBe("1.0.0.0");
  });

  it("names the same provider and support URL as the Word production manifest", () => {
    const wordProd = read("manifest.prod.xml");
    expect(elementValue("ProviderName", outlookProd)).toBe(elementValue("ProviderName", wordProd));
    expect(supportUrl(outlookProd)).toBe(supportUrl(wordProd));
  });

  it("never points at localhost", () => {
    expect(outlookProd).not.toMatch(/localhost/);
  });

  it("serves the pane, icons and forms from the stable host", () => {
    const urls = [...outlookProd.matchAll(/DefaultValue="(https:\/\/[^"]+)"/g)].map((m) => m[1]!);
    const hosted = urls.filter((url) => !url.startsWith("https://elefant.legal/"));
    expect(hosted.length).toBeGreaterThan(0);
    expect(hosted.filter((url) => !url.startsWith("https://addin.elefant.legal/"))).toEqual([]);
  });

  it("keeps the dev manifest's mail surfaces and permissions", () => {
    const strip = (manifest: string) =>
      manifest
        .replace(/^<!-- ABOUTME:.*$/gm, "")
        .replace(/<Id>[^<]+<\/Id>/, "")
        .replace(/<ProviderName>[^<]+<\/ProviderName>/, "")
        .replace(/https:\/\/(localhost:3000|addin\.elefant\.legal)/g, "ORIGIN");
    expect(strip(outlookProd)).toBe(strip(read("manifest.outlook.xml")));
  });

  it("is copied into the production image at /manifest-outlook.xml", () => {
    expect(read("Dockerfile")).toMatch(
      /^COPY manifest\.outlook\.prod\.xml \/usr\/share\/nginx\/html\/manifest-outlook\.xml$/m,
    );
  });
});
