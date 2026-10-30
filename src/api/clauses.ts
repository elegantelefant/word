// ABOUTME: Clauses API — list databases, list/search clauses, suggest, draft.
// ABOUTME: All endpoints require Elefant auth (paid tier only).

import { apiFetch } from "./client";
import { pollForResult } from "@/lib/polling";

export interface ClauseDatabase {
  id: string;
  name?: string;
  clauseCount?: number;
}

export interface Clause {
  id: string;
  name: string;
  content: string;
  category?: string | null;
  tags?: string[];
  createdAt?: string | null;
}

interface ClauseDatabaseListResponse {
  databases: ClauseDatabase[];
}

interface ClauseListResponse {
  clauses: Clause[];
}

export async function listClauseDatabases(token: string): Promise<ClauseDatabase[]> {
  const res = await apiFetch<ClauseDatabaseListResponse>("/clause-databases", token);
  return res.databases;
}

export async function listClauses(databaseId: string, token: string): Promise<Clause[]> {
  const res = await apiFetch<ClauseListResponse>(`/clause-databases/${databaseId}/clauses`, token);
  return res.clauses;
}

export async function suggestClause(
  databaseId: string,
  context: string,
  token: string,
): Promise<Clause[]> {
  const res = await apiFetch<{ suggestions: Clause[] }>(
    `/clause-databases/${databaseId}/suggest`,
    token,
    { method: "POST", body: { context } },
  );
  return res.suggestions ?? [];
}

export async function draftClause(
  prompt: string,
  context: string,
  token: string,
): Promise<string> {
  const job = await apiFetch<{ jobId: string }>("/draft", token, {
    method: "POST",
    body: { prompt, supplementContext: context },
  });
  const result = await pollForResult(job.jobId, token);
  const draft = result.result?.draft;
  if (typeof draft !== "string" || !draft) throw new Error("The draft came back empty.");
  return draft;
}
