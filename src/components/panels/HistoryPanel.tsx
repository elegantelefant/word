// ABOUTME: History panel — shows past activity (local for free, API for paid).
// ABOUTME: Free tier stores reviews in localStorage; paid tier fetches from API.

import { useState, useEffect } from "react";
import { useAuth } from "@/store/auth";
import { listJobs } from "@/api/jobs";
import { getLocalHistory } from "@/lib/history";
import type { LocalHistoryItem } from "@/lib/history";
import type { Job } from "@/types/api";

export function HistoryPanel() {
  const { tier, token } = useAuth();

  return tier === "paid" && token ? <ApiHistory token={token} /> : <LocalHistory />;
}

function LocalHistory() {
  const [items, setItems] = useState<LocalHistoryItem[]>([]);

  useEffect(() => {
    setItems(getLocalHistory());
  }, []);

  if (items.length === 0) {
    return <EmptyState message="No review history yet. Run a review to get started." />;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-600">Local History</h4>
      {items.map((item) => (
        <div key={item.id} className="rounded border border-gray-200 p-2">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-gray-700">{item.type}</span>
            <span className="text-[10px] text-gray-400">{formatDate(item.timestamp)}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.summary}</p>
        </div>
      ))}
    </div>
  );
}

function ApiHistory({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listJobs(token)
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-xs text-gray-400">Loading history...</p>;
  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (jobs.length === 0) return <EmptyState message="No jobs found in your account." />;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-600">Activity Feed</h4>
      {jobs.map((job) => (
        <div key={job.id} className="rounded border border-gray-200 p-2">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-gray-700">{job.type}</span>
            <StatusBadge status={job.status} />
          </div>
          <div className="mt-0.5 flex gap-2 text-[10px] text-gray-400">
            <span>{formatDate(job.createdAt)}</span>
            {job.query && <span className="line-clamp-1">{job.query}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-gray-100 text-gray-600",
    running: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-1">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l2.5 2.5" />
      </svg>
      <p className="max-w-[200px] text-xs leading-relaxed text-gray-400">{message}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}
