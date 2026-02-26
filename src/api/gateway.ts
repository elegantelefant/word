// ABOUTME: Pydantic AI gateway client for BYOK (free-tier) LLM calls.
// ABOUTME: Sends structured prompts with user's own API key, returns parsed review.

import type { GatewayRequest, ReviewIssue, ReviewResponse } from "@/types/api";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "https://gateway.elefant.legal";

const REVIEW_SYSTEM_PROMPT = `You are a legal document reviewer. Analyze the provided text and return a JSON object with:
- "summary": a concise 1-3 sentence summary of key findings
- "issues": an array of objects, each with:
  - "message": description of the issue
  - "kind": one of "risk", "ambiguity", "missing", "style", "other"
  - "location": the relevant text snippet (short)
  - "suggestion": suggested fix or improvement (optional)

Focus on: legal risks, ambiguous language, missing clauses, and style issues.
Return ONLY valid JSON, no markdown fences.`;

export async function reviewViaGateway(
  text: string,
  apiKey: string,
  model: string,
  instructions?: string,
): Promise<ReviewResponse> {
  const userPrompt = instructions
    ? `Review the following text. Focus on: ${instructions}\n\n---\n\n${text}`
    : `Review the following legal text:\n\n---\n\n${text}`;

  const req: GatewayRequest = {
    model,
    messages: [
      { role: "system", content: REVIEW_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Gateway error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? data.content ?? "";

  return parseReviewResponse(content);
}

function parseReviewResponse(raw: string): ReviewResponse {
  try {
    const parsed = JSON.parse(raw.trim());
    return {
      summary: parsed.summary ?? "No summary provided.",
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(normalizeIssue) : [],
    };
  } catch {
    // LLM returned non-JSON — wrap it as a plain summary
    return { summary: raw.trim(), issues: [] };
  }
}

const VALID_KINDS = new Set(["risk", "ambiguity", "missing", "style", "other"]);

function normalizeIssue(raw: Record<string, unknown>): ReviewIssue {
  const kind = typeof raw.kind === "string" && VALID_KINDS.has(raw.kind)
    ? (raw.kind as ReviewIssue["kind"])
    : "other";

  return {
    message: String(raw.message ?? ""),
    kind,
    location: typeof raw.location === "string" ? raw.location : null,
    suggestion: typeof raw.suggestion === "string" ? raw.suggestion : null,
  };
}
