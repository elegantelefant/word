// ABOUTME: Single source of truth for the API version prefix and the set of
// ABOUTME: endpoints the wrappers call; consumed by the client and the contract test.

/** Version prefix every Elefant API path carries. Prepended once in client.ts. */
export const API_PREFIX = "/api/v1";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** An endpoint as it appears in the OpenAPI spec: method + prefixed path template. */
export interface Endpoint {
  method: HttpMethod;
  path: string;
}

/**
 * Every {method, path} the wrappers exercise, using OpenAPI path-template names.
 * The contract test asserts each exists (and is not deprecated) in openapi.json.
 */
export const API_ENDPOINTS: readonly Endpoint[] = [
  // account
  { method: "GET", path: "/api/v1/me" },
  { method: "GET", path: "/api/v1/whoami" },
  // review / research
  { method: "POST", path: "/api/v1/review" },
  { method: "POST", path: "/api/v1/research" },
  // jobs
  { method: "GET", path: "/api/v1/jobs" },
  { method: "GET", path: "/api/v1/jobs/{job_id}" },
  { method: "GET", path: "/api/v1/jobs/{job_id}/result" },
  // clauses
  { method: "GET", path: "/api/v1/clause-databases" },
  { method: "GET", path: "/api/v1/clause-databases/{database_id}/clauses" },
  { method: "POST", path: "/api/v1/clause-databases/{database_id}/suggest" },
  // mammoth / legal requests
  { method: "POST", path: "/api/v1/legal-requests" },
  { method: "GET", path: "/api/v1/legal-requests" },
  { method: "GET", path: "/api/v1/legal-requests/{request_id}" },
  { method: "POST", path: "/api/v1/legal-requests/{request_id}/execute" },
] as const;
