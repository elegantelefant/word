// ABOUTME: Layer-1 contract freshness gate — every wrapper endpoint must exist,
// ABOUTME: at the right method and not deprecated, in the vendored openapi.json.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { API_ENDPOINTS } from "@/api/endpoints";

interface OpenApiSpec {
  info: { version: string };
  paths: Record<string, Record<string, { deprecated?: boolean }>>;
}

const spec: OpenApiSpec = JSON.parse(
  readFileSync(resolve(process.cwd(), "openapi.json"), "utf-8"),
);

describe("openapi.json", () => {
  it("is the canonical 0.4.0 spec", () => {
    expect(spec.info.version).toBe("0.4.0");
    expect(Object.keys(spec.paths).length).toBe(198);
  });
});

describe("API contract", () => {
  it.each(API_ENDPOINTS.map((e) => [e.method, e.path, e] as const))(
    "%s %s exists in the spec and is not deprecated",
    (method, _path, endpoint) => {
      const operation = spec.paths[endpoint.path]?.[method.toLowerCase()];
      expect(operation, `${method} ${endpoint.path} missing from openapi.json`).toBeDefined();
      expect(operation!.deprecated ?? false, `${method} ${endpoint.path} is deprecated`).toBe(false);
    },
  );
});
