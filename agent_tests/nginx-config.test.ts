// ABOUTME: Tests security headers in the production nginx configuration.
// ABOUTME: Verifies the exact server-level CSP, including which hosts may frame the pages (#85).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Hosts allowed to embed the task pane and the Teams tab (#85). Commercial cloud only; sources in nginx.conf.
const FRAME_ANCESTORS = [
  "'self'",
  "https://*.officeapps.live.com",
  "https://*.office.guest.usercontent.microsoft",
  "https://*.sharepoint.com",
  "https://onedrive.live.com",
  "https://*.cloud.microsoft",
  "https://teams.microsoft.com",
  "https://*.teams.microsoft.com",
  "https://*.microsoft365.com",
  "https://*.office.com",
  "https://outlook.office.com",
  "https://outlook.office365.com",
  "https://outlook-sdf.office.com",
  "https://outlook-sdf.office365.com",
];

// Commercial entries of OfficeOnlineDomainList in the CDN office.js that index.html loads
// (appsforoffice.microsoft.com/lib/1/hosted/word-web-16.00.js, fetched 2026-11-17).
const OFFICE_WEB_DOMAINS = [
  "*.officeapps.live.com",
  "*.office.svc.cloud.microsoft",
  "*.office.guest.usercontent.microsoft",
  "*.excel.cloud.microsoft",
  "*.word.cloud.microsoft",
  "*.powerpoint.cloud.microsoft",
];

const nginxConfigPath = resolve(process.cwd(), "nginx.conf");

const activeConfig = readFileSync(nginxConfigPath, "utf8").replace(
  /^\s*#.*$/gm,
  "",
);

describe("production nginx configuration", () => {
  it("sets the exact CSP at server level", () => {
    const matches = [
      ...activeConfig.matchAll(
        /^ {4}add_header Content-Security-Policy "([^"]+)" always;$/gm,
      ),
    ];

    expect(matches).toHaveLength(1);

    const directives = Object.fromEntries(
      matches[0]![1]!
        .split(";")
        .map((directive) => directive.trim())
        .filter(Boolean)
        .map((directive) => {
          const [name, ...values] = directive.split(/\s+/);
          return [name, values];
        }),
    );

    expect(directives).toEqual({
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "https://appsforoffice.microsoft.com",
      ],
      "style-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "connect-src": [
        "'self'",
        "https://elefant.legal",
        "https://generativelanguage.googleapis.com",
      ],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": FRAME_ANCESTORS,
    });
  });

  it("lets the SPA location inherit the server-level CSP", () => {
    const rootLocation = activeConfig.match(
      /^ {4}location \/ \{\r?\n([\s\S]*?)^ {4}\}/m,
    );

    expect(rootLocation).not.toBeNull();
    expect(rootLocation![1]).not.toMatch(/^\s+add_header\b/m);
  });
});

describe("frame-ancestors (#85)", () => {
  const csp = activeConfig.match(/add_header Content-Security-Policy "([^"]+)"/)![1]!;
  const directiveNames = csp.split(";").map((d) => d.trim().split(/\s+/)[0]).filter(Boolean);
  const served = csp.match(/frame-ancestors ([^;]+)/)![1]!.trim().split(/\s+/);
  const matchesSource = (domain: string) => served.some((source) => {
    const host = source.replace("https://", "");
    return host === domain || (host.startsWith("*.") && domain.endsWith(host.slice(1)));
  });

  it("covers every commercial Word for the web domain in the CDN office.js", () => {
    expect(OFFICE_WEB_DOMAINS.filter((domain) => !matchesSource(domain))).toEqual([]);
  });

  it("names each CSP directive once, since browsers obey only the first copy", () => {
    expect(new Set(directiveNames).size).toBe(directiveNames.length);
  });

  it("sends no X-Frame-Options, which would override frame-ancestors for older hosts", () => {
    expect(activeConfig).not.toMatch(/X-Frame-Options/i);
  });

  it("keeps add_header out of every location except the non-HTML ones, so pages keep the CSP", () => {
    const locationsWithHeaders = [...activeConfig.matchAll(/^ {4}location ([^{]+)\{\r?\n([\s\S]*?)^ {4}\}/gm)]
      .filter((m) => /^\s+add_header\b/m.test(m[2]!))
      .map((m) => m[1]!.trim());
    const nonHtml = ["= /manifest.xml", "= /manifest-download.xml", "~ \\.(command|bat)$", "/assets/"];
    expect(locationsWithHeaders.filter((location) => !nonHtml.includes(location))).toEqual([]);
  });
});
