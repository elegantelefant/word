// ABOUTME: Tests security headers in the production nginx configuration.
// ABOUTME: Verifies the task pane enforces an exact server-level Content Security Policy.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Hosts allowed to embed the task pane and the Teams tab (#85). Sources in nginx.conf.
const FRAME_ANCESTORS = [
  "'self'",
  // Word for the web: office.js OfficeCore.OfficeOnlineDomainList, and the pages that open documents.
  "https://*.officeapps.live.com",
  "https://*.officeapps-df.live.com",
  "https://*.dod.online.office365.us",
  "https://*.gov.online.office365.us",
  "https://*.online.office.de",
  "https://*.partner.officewebapps.cn",
  "https://*.sharepoint.com",
  "https://onedrive.live.com",
  // Teams tab hosts: learn.microsoft.com/microsoftteams/platform/tabs/how-to/tab-requirements.
  "https://*.cloud.microsoft",
  "https://teams.microsoft.com",
  "https://*.teams.microsoft.com",
  "https://*.microsoft365.com",
  "https://*.office.com",
  "https://outlook.office.com",
  "https://outlook.office365.com",
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
  it("allows every Office on the web domain the installed office.js trusts as a host", () => {
    const officeJs = readFileSync(
      resolve(process.cwd(), "node_modules/@microsoft/office-js/dist/word-web-16.00.debug.js"),
      "utf8",
    );
    const list = officeJs.match(/OfficeOnlineDomainList = \[([^\]]+)\]/)![1]!;
    const officeDomains = [...list.matchAll(/"([^"]+)"/g)].map((m) => `https://${m[1]}`);

    const served = activeConfig.match(/frame-ancestors ([^;"]+)/)?.[1]?.split(/\s+/) ?? [];

    expect(officeDomains.length).toBeGreaterThan(0);
    expect(served).toEqual(expect.arrayContaining(officeDomains));
  });
});
