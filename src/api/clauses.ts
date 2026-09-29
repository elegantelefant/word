// ABOUTME: Clauses API — list databases and clauses.
// ABOUTME: All endpoints require Elefant auth (paid tier only).

import { apiFetch } from "./client";

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
