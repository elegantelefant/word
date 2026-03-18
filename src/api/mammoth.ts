// ABOUTME: Mammoth API — create, list, and track legal requests.
// ABOUTME: All endpoints require Elefant auth (paid tier only).

import { apiFetch } from "./client";

export type RequestType = "research" | "draft" | "review" | "extraction" | "analysis";
export type RequestPriority = "low" | "normal" | "high" | "urgent";
export type RequestStatus = "draft" | "pending" | "in_progress" | "completed" | "failed" | "cancelled";

export interface LegalRequest {
  id: string;
  request_type: RequestType;
  status: RequestStatus;
  priority: RequestPriority;
  title: string;
  description?: string | null;
  category?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateLegalRequest {
  request_type: RequestType;
  title: string;
  description?: string;
  category?: string;
  priority?: RequestPriority;
  input?: Record<string, unknown>;
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

export async function getLegalRequest(
  requestId: string,
  token: string,
): Promise<LegalRequest> {
  return apiFetch<LegalRequest>(`/legal-requests/${requestId}`, token);
}

export async function executeLegalRequest(
  requestId: string,
  token: string,
): Promise<{ job_id: string; status: string }> {
  return apiFetch(`/legal-requests/${requestId}/execute`, token, { method: "POST" });
}
