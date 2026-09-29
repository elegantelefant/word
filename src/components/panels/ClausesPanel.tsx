// ABOUTME: Clauses panel — search and browse clause databases, insert into Word.
// ABOUTME: Paid-only feature; shows UpgradePrompt for free-tier users.

import { useState, useEffect } from "react";
import { useAuth } from "@/store/auth";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { listClauseDatabases, listClauses, type Clause, type ClauseDatabase } from "@/api/clauses";
import { insertText, isOfficeReady } from "@/lib/office";

export function ClausesPanel() {
  const { tier, token } = useAuth();

  if (tier !== "paid" || !token) {
    return <UpgradePrompt feature="Clause Search" />;
  }

  return <ClausesContent token={token} />;
}

function ClausesContent({ token }: { token: string }) {
  const [databases, setDatabases] = useState<ClauseDatabase[]>([]);
  const [activeDb, setActiveDb] = useState<string | null>(null);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listClauseDatabases(token)
      .then((dbs) => {
        setDatabases(dbs);
        if (dbs[0]) setActiveDb(dbs[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!activeDb) return;
    setLoading(true);
    listClauses(activeDb, token)
      .then(setClauses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeDb, token]);

  const filtered = search
    ? clauses.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.content.toLowerCase().includes(search.toLowerCase()),
      )
    : clauses;

  async function handleInsert(text: string) {
    if (!isOfficeReady()) return;
    try {
      await insertText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to insert");
    }
  }

  return (
    <div className="space-y-3">
      {/* Database selector (if multiple) */}
      {databases.length > 1 && (
        <select
          value={activeDb ?? ""}
          onChange={(e) => setActiveDb(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
        >
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.name ?? db.id} ({db.clauseCount ?? 0})
            </option>
          ))}
        </select>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search clauses..."
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />

      {loading && <p className="text-xs text-gray-400">Loading clauses...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Results */}
      <div className="space-y-2">
        {filtered.map((clause) => (
          <div key={clause.id} className="rounded border border-gray-200 p-2">
            <button
              onClick={() => setExpanded(expanded === clause.id ? null : clause.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-medium text-gray-700">{clause.name}</span>
              <span className="text-[10px] text-gray-400">{expanded === clause.id ? "−" : "+"}</span>
            </button>
            {clause.category && (
              <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {clause.category}
              </span>
            )}
            {expanded === clause.id && (
              <div className="mt-2 space-y-1.5">
                <p className="whitespace-pre-wrap text-xs text-gray-600">{clause.content}</p>
                <button
                  onClick={() => handleInsert(clause.content)}
                  className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  Insert into document
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">
            {search ? "No matching clauses." : "No clauses in this database."}
          </p>
        )}
      </div>
    </div>
  );
}
