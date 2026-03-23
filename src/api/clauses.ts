// ABOUTME: Clauses API — list databases, list/search clauses, suggest.
// ABOUTME: All endpoints require Elefant auth (paid tier only).

import type { ClauseDatabase, Clause, ClauseDatabaseListResponse, ClauseListResponse } from "@/types/api";
import { apiFetch } from "./client";

export type { ClauseDatabase, Clause };

export async function listClauseDatabases(token: string): Promise<ClauseDatabase[]> {
  const res = await apiFetch<ClauseDatabaseListResponse>("/clause-databases", token);
  return res.databases;
}

export async function listClauses(databaseId: string, token: string): Promise<Clause[]> {
  const res = await apiFetch<ClauseListResponse>(`/clause-databases/${encodeURIComponent(databaseId)}/clauses`, token);
  return res.clauses;
}

export async function suggestClause(
  databaseId: string,
  context: string,
  token: string,
): Promise<Clause[]> {
  const res = await apiFetch<{ suggestions: Clause[] }>(
    `/clause-databases/${encodeURIComponent(databaseId)}/suggest`,
    token,
    { method: "POST", body: { context } },
  );
  return res.suggestions ?? [];
}
