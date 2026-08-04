// ABOUTME: Base HTTP client for Elefant API with auth header injection.
// ABOUTME: Handles network errors, token expiry (401), and rate limiting.

export const API_URL = import.meta.env.VITE_API_URL || "https://elefant.legal/api/v4";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
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
    const text = await res.text().catch(() => res.statusText);
    if (res.status === 401) {
      throw new ApiError(401, "Session expired. Please sign in again.");
    }
    if (res.status === 429) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}
