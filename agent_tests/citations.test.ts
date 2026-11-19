// ABOUTME: Tests the citation-check client: POST /citations/check, poll the job, read each citation's status.
// ABOUTME: Only fetch is replaced; apiFetch and the job poller are the real code.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkCitations } from "@/api/citations";

beforeEach(() => {
  vi.restoreAllMocks();
});

const jobFlow = (result: unknown) =>
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "c1", pollUrl: "/jobs/c1", status: "queued" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "c1", type: "citation_check", status: "completed", createdAt: "2026-11-17" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "c1", status: "completed", result })));

describe("checkCitations (#106)", () => {
  it("posts the document text to the citation-check route and returns each citation with its status", async () => {
    const fetchSpy = jobFlow({
      jobType: "citation_check",
      total: 2,
      results: [
        { citation: "[2020] SGCA 1", status: "verified", normalized: "[2020] SGCA 1", sourceUrl: "https://elefant.legal/c/1" },
        { citation: "[2031] SGHC 999", status: "hallucinated" },
      ],
    });

    const result = await checkCitations("See [2020] SGCA 1 and [2031] SGHC 999.", "tok");

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/citations\/check$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ text: "See [2020] SGCA 1 and [2031] SGHC 999." });
    expect(result).toEqual([
      { citation: "[2020] SGCA 1", status: "verified", sourceUrl: "https://elefant.legal/c/1" },
      { citation: "[2031] SGHC 999", status: "hallucinated", sourceUrl: null },
    ]);
  });

  it("reads an unknown status as uncertain and skips results with no citation text", async () => {
    jobFlow({ jobType: "citation_check", total: 2, results: [{ citation: "s 2 Evidence Act", status: "new_status" }, { status: "verified" }] });

    await expect(checkCitations("text with s 2 Evidence Act", "tok")).resolves.toEqual([
      { citation: "s 2 Evidence Act", status: "uncertain", sourceUrl: null },
    ]);
  });
});
