// ABOUTME: Mammoth panel — create and track legal requests from Word.
// ABOUTME: Paid-only; shows create form + request list with status tracking.

import { useState, useCallback } from "react";
import { useAuth } from "@/store/auth";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  createLegalRequest,
  listLegalRequests,
  type LegalRequest,
  type RequestType,
  type RequestPriority,
} from "@/api/mammoth";
import { getSelectedText, isOfficeReady } from "@/lib/office";
import { useRefreshOnActive } from "@/hooks/useRefreshOnActive";

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: "review", label: "Review" },
  { value: "research", label: "Research" },
  { value: "draft", label: "Draft" },
  { value: "extraction", label: "Extraction" },
  { value: "analysis", label: "Analysis" },
];

const PRIORITIES: { value: RequestPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function MammothPanel({ active = true }: { active?: boolean }) {
  const { tier, token } = useAuth();

  if (tier !== "paid" || !token) {
    return <UpgradePrompt feature="Mammoth" />;
  }

  return <MammothContent token={token} active={active} />;
}

function MammothContent({ token, active }: { token: string; active: boolean }) {
  const [view, setView] = useState<"create" | "list">("list");
  const [requests, setRequests] = useState<LegalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setRequests(await listLegalRequests(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useRefreshOnActive(active, refresh);

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("list")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            view === "list" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Requests
        </button>
        <button
          onClick={() => setView("create")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            view === "create" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          + New
        </button>
                <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh requests"
          className="ml-auto rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {view === "create" ? (
        <CreateForm
          token={token}
          onCreated={() => {
            setView("list");
            refresh();
          }}
        />
      ) : (
        <RequestList requests={requests} loading={loading} />
      )}
    </div>
  );
}

function CreateForm({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("review");
  const [priority, setPriority] = useState<RequestPriority>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attachSelection() {
    if (!isOfficeReady()) return;
    const text = await getSelectedText();
    if (text) {
      setDescription((prev) => (prev ? `${prev}\n\n---\n\n${text}` : text));
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createLegalRequest(
        { request_type: requestType, title, description: description || undefined, priority },
        token,
      );
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Request title..."
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />

      <div className="flex gap-2">
        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as RequestType)}
          className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs"
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as RequestPriority)}
          className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description / context..."
        rows={4}
        className="w-full resize-none rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />

      <button
        onClick={attachSelection}
        className="text-xs text-blue-600 hover:underline"
      >
        Attach selected text from document
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Request"}
      </button>
    </div>
  );
}

function RequestList({ requests, loading }: { requests: LegalRequest[]; loading: boolean }) {
  if (loading) return <p className="text-xs text-gray-400">Loading requests...</p>;

  if (requests.length === 0) {
    return <p className="py-4 text-center text-xs text-gray-400">No legal requests yet.</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <div key={req.id} className="rounded border border-gray-200 p-2">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-gray-700">{req.title}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[req.status] ?? "bg-gray-100"}`}>
              {req.status}
            </span>
          </div>
          <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
            <span>{req.request_type}</span>
            <span>{req.priority}</span>
          </div>
          {req.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{req.description}</p>
          )}
          {req.result && (
            <p className="mt-1 text-xs text-green-700">Result available</p>
          )}
        </div>
      ))}
    </div>
  );
}
