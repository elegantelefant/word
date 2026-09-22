// ABOUTME: Mammoth API — create and list legal requests.
// ABOUTME: All endpoints require Elefant auth (paid tier only).

import { apiFetch } from "./client";

export type RequestType = "research" | "draft" | "review" | "extraction" | "analysis" | "uncertain";
export type RequestPriority = "low" | "normal" | "high" | "urgent";
export type RequestStatus = "pending" | "assigned" | "in_progress" | "awaiting_review" | "completed" | "failed" | "cancelled";

export interface LegalRequest {
  id: string;
  requestType: RequestType;
  status: RequestStatus;
  priority: RequestPriority;
  title: string;
  description?: string | null;
  category?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateLegalRequest {
  requestType: RequestType;
  title: string;
  description?: string;
  category?: string;
  priority?: RequestPriority;
}

interface LegalRequestListResponse {
  requests: LegalRequest[];
  total: number;
}

export async function createLegalRequest(
  data: CreateLegalRequest,
  token: string,
): Promise<LegalRequest> {
  return apiFetch<LegalRequest>("/legal-requests", token, {
    method: "POST",
    body: data,
  });
}

export async function listLegalRequests(
  token: string,
  status?: RequestStatus,
): Promise<LegalRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const res = await apiFetch<LegalRequestListResponse>(`/legal-requests${qs ? `?${qs}` : ""}`, token);
  return res.requests;
}
