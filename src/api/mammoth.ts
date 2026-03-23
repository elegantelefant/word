// ABOUTME: Mammoth API — create, list, and track legal requests.
// ABOUTME: All endpoints require Elefant auth (paid tier only).

import type {
  LegalRequest,
  CreateLegalRequest,
  LegalRequestListResponse,
  RequestType,
  RequestPriority,
  RequestStatus,
} from "@/types/api";
import { apiFetch } from "./client";

export type { LegalRequest, CreateLegalRequest, RequestType, RequestPriority, RequestStatus };

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
