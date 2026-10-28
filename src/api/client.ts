// ABOUTME: Base HTTP client for Elefant API with auth header injection.
// ABOUTME: Handles network errors, token expiry (401), and rate limiting.

export const API_URL = import.meta.env.VITE_API_URL || "https://elefant.legal/api/v4";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public reason?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal } = options;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new NetworkError("Network request failed. Check your connection.");
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(401, "Session expired. Please sign in again.");
    }

    if (res.status === 429) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }

    let message = "Something went wrong while contacting Elefant. Please try again.";
    let reason: string | undefined;

    try {
      const body: unknown = JSON.parse(await res.text());

      if (typeof body === "object" && body !== null) {
        const data = "data" in body && typeof body.data === "object" && body.data !== null
          ? body.data
          : undefined;

        if ("message" in body && typeof body.message === "string") {
          message = body.message;
        } else if (data && "message" in data && typeof data.message === "string") {
          message = data.message;
        }

        if ("statusMessage" in body && typeof body.statusMessage === "string") {
          reason = body.statusMessage;
        } else if (data && "reason" in data && typeof data.reason === "string") {
          reason = data.reason;
        }
      }
    } catch {
      // Non-JSON and unreadable bodies use the safe generic message.
    }

    console.error("Elefant API request failed", {
      path,
      status: res.status,
    });

    throw new ApiError(res.status, message, reason);
  }

  const text = await res.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Elefant API returned invalid JSON", {
      path,
      status: res.status,
    });

    throw new ApiError(
      res.status,
      "Elefant returned an invalid response. Please try again.",
    );
  }
}

/** Orval mutator: keep auth, errors and cancellation in the shared fetch wrapper. */
export function contractFetch<T>(
  config: { url: string; method: string; data?: unknown; params?: Record<string, unknown>; headers?: Record<string, string>; signal?: AbortSignal },
  options: { token: string; signal?: AbortSignal } | undefined,
): Promise<T> {
  if (!options?.token) throw new Error("An API token is required.");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(config.params ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const query = params.toString();
  // The contract describes the upstream v1 routes; API_URL is the versioned proxy.
  const path = config.url.replace(/^\/api\/v1(?=\/)/, "");
  return apiFetch<T>(`${path}${query ? `?${query}` : ""}`, options.token, {
    method: config.method,
    body: config.data,
    headers: config.headers,
    signal: options.signal ?? config.signal,
  });
}
