// ABOUTME: Tests security headers in the production nginx configuration.
// ABOUTME: Verifies the exact server-level CSP and the manifest download headers and links.

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
  const locationBlock = (path: string) => {
    const block = activeConfig.match(new RegExp(`^ {4}location = ${path.replace(/\./g, "\\.")} \\{\\r?\\n([\\s\\S]*?)^ {4}\\}`, "m"))?.[1];
    if (block === undefined) throw new Error(`nginx.conf has no "location = ${path}" block`);
    return block;
  };

  it("serves the manifest from a download path as an attachment named manifest.xml", () => {
    const block = locationBlock("/manifest-download.xml");
    expect(block).toContain("alias /usr/share/nginx/html/manifest.xml;");
    expect(block).toMatch(/add_header Content-Disposition 'attachment; filename="manifest\.xml"' always;/);
    expect(block).toContain('add_header Access-Control-Allow-Origin "*" always;');
    // The type comes from the server-level types block; a second add_header doubles it (#86).
    expect(block).not.toMatch(/add_header Content-Type/);
  });

  it.each(["README.md", "agent_docs/2026-03-05-user-install-guide.md"])("points %s's user download links at the download path", (path) => {
    const doc = readFileSync(resolve(process.cwd(), path), "utf8");
    const install = path === "README.md" ? doc.slice(doc.indexOf("## User installation"), doc.indexOf("## Privacy")) : doc;
    expect(install).toContain("https://addin.elefant.legal/manifest-download.xml");
    expect(install).not.toMatch(/https:\/\/[^)\s]+\/manifest\.xml/);
  });

  it("leaves /manifest.xml without Content-Disposition for the admin centre's manifest URL", () => {
    const block = locationBlock("/manifest.xml");
    expect(block).toContain("alias /usr/share/nginx/html/manifest.xml;");
    expect(block).not.toContain("Content-Disposition");
  });
});
