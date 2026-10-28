// ABOUTME: Generates only the API operations already used by the Word add-in.
// ABOUTME: Both clients and validators read the promoted root OpenAPI contract.
import { defineConfig } from "orval";

const operations = new Set([
  "me", "review", "research", "draft", "list_jobs", "get_job_status", "get_job_result",
  "list_clause_databases", "list_clauses", "suggest_clause", "create_legal_request",
  "list_legal_requests", "get_legal_request", "execute_legal_request",
]);

const input: NonNullable<import("orval").Options["input"]> = {
  target: "./openapi.json",
  override: {
    transformer: (spec) => {
      spec.paths = Object.fromEntries(Object.entries(spec.paths).flatMap(([path, item]) => {
        const selected = Object.fromEntries(Object.entries(item ?? {}).filter(([, operation]) =>
          operation && typeof operation === "object" && "operationId" in operation && operations.has(operation.operationId),
        ));
        return Object.keys(selected).length ? [[path, selected]] : [];
      }));
      // Keep only schemas reachable from these operations, plus the review payload
      // consumed from the generic job result by the existing review UI.
      const schemas = spec.components?.schemas ?? {};
      const used = new Set<string>();
      const visit = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          if (key === "$ref" && typeof child === "string" && child.startsWith("#/components/schemas/")) {
            const name = child.slice("#/components/schemas/".length);
            if (!used.has(name)) { used.add(name); visit(schemas[name]); }
          } else visit(child);
        }
      };
      visit(spec.paths);
      used.add("ReviewResponse");
      visit(schemas.ReviewResponse);
      if (spec.components) spec.components.schemas = Object.fromEntries(
        Object.entries(schemas).filter(([name]) => used.has(name)),
      );
      return spec;
    },
  },
};

export default defineConfig({
  client: {
    input,
    output: {
      target: "./src/api/generated/client.ts",
      client: "axios-functions",
      override: {
        operationName: (operation) => `word_${operation.operationId}`,
        mutator: { path: "./src/api/client.ts", name: "contractFetch" },
      },
    },
  },
  validators: {
    input,
    output: {
      target: "./src/api/generated/schemas.ts",
      client: "zod",
    },
  },
});
