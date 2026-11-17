// ABOUTME: Tests security headers in the production nginx configuration.
// ABOUTME: Verifies the task pane enforces an exact server-level Content Security Policy.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
describe("manifest download (#86)", () => {
  const locationBlock = (path: string) =>
    activeConfig.match(new RegExp(`^ {4}location = ${path.replace(/\./g, "\\.")} \\{\\r?\\n([\\s\\S]*?)^ {4}\\}`, "m"))?.[1] ?? "";

  it("serves the manifest from a download path as an attachment named manifest.xml", () => {
    const block = locationBlock("/manifest-download.xml");
    expect(block).toContain("alias /usr/share/nginx/html/manifest.xml;");
    expect(block).toMatch(/add_header Content-Disposition 'attachment; filename="manifest\.xml"' always;/);
  });

  it("points the README's user download link at the download path", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const install = readme.slice(readme.indexOf("## User installation"), readme.indexOf("## Privacy"));
    expect(install).toContain("https://addin.elefant.legal/manifest-download.xml");
    expect(install).not.toContain("https://addin.elefant.legal/manifest.xml");
  });

  it("leaves /manifest.xml without Content-Disposition for the admin centre's manifest URL", () => {
    expect(locationBlock("/manifest.xml")).not.toContain("Content-Disposition");
  });
});
