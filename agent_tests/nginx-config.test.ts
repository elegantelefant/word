// ABOUTME: Tests security headers in the production nginx configuration.
// ABOUTME: Verifies the task pane enforces a restrictive Content Security Policy.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const nginxConfig = readFileSync(resolve(process.cwd(), "nginx.conf"), "utf8");

describe("production nginx configuration", () => {
  it("enforces a Content Security Policy for the task pane", () => {
    expect(nginxConfig).toContain("add_header Content-Security-Policy");
    expect(nginxConfig).toContain("default-src 'self'");
    expect(nginxConfig).toContain(
      "script-src 'self' https://appsforoffice.microsoft.com",
    );
    expect(nginxConfig).toContain("style-src 'self'");
    expect(nginxConfig).toContain("img-src 'self' data:");
    expect(nginxConfig).toContain(
      "connect-src 'self' https://elefant.legal https://generativelanguage.googleapis.com",
    );
    expect(nginxConfig).toContain("object-src 'none'");
    expect(nginxConfig).toContain("base-uri 'self'");

    expect(nginxConfig).not.toContain("'unsafe-inline'");
    expect(nginxConfig).not.toContain("'unsafe-eval'");
    expect(nginxConfig).toMatch(
      /add_header Content-Security-Policy "[^"]+" always;/,
    );
  });
});