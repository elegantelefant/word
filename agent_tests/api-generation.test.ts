// @vitest-environment node
// ABOUTME: Detects drift between the promoted API contract and committed Orval output.
// ABOUTME: Exercises generated requests through Word's authenticated fetch wrapper.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { reviewPaid, runFullAnalysis } from "@/api/review";
import { afterEach, expect, it, vi } from "vitest";
import { word_review as wordReview, word_list_jobs as wordListJobs } from "@/api/generated/client";
import { reviewBody } from "@/api/generated/schemas";

const root = resolve(import.meta.dirname, "..");

function output(directory: string): Record<string, string> {
  return Object.fromEntries(readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      return [path.slice(directory.length + 1), readFileSync(path, "utf8")];
    }));
}

afterEach(() => vi.restoreAllMocks());

it("committed API output matches a fresh generate:api run", () => {
  const temporary = mkdtempSync(join(root, ".api-generation-"));
  try {
    for (const file of ["package.json", "orval.config.ts", "openapi.json"]) {
      cpSync(join(root, file), join(temporary, file));
    }
    mkdirSync(join(temporary, "src/api"), { recursive: true });
    cpSync(join(root, "src/api/client.ts"), join(temporary, "src/api/client.ts"));
    symlinkSync(join(root, "node_modules"), join(temporary, "node_modules"), "dir");
    execFileSync("pnpm", ["generate:api"], { cwd: temporary, stdio: "pipe", timeout: 30_000 });
    expect(output(join(root, "src/api/generated"))).toEqual(output(join(temporary, "src/api/generated")));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}, 40_000);

it("generated review sends auth, body and cancellation through the fetch wrapper", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ jobId: "job", pollUrl: "/jobs/job" })));
  const controller = new AbortController();
  const body = { text: "Review this contract", instructions: "Check risks" };
  await expect(wordReview(body, { token: "secret", signal: controller.signal })).resolves.toEqual({ jobId: "job", pollUrl: "/jobs/job" });
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v4\/api\/v1\/review$/), expect.objectContaining({
    method: "POST", signal: controller.signal, body: JSON.stringify(body),
    headers: expect.objectContaining({ Authorization: "Bearer secret", "Content-Type": "application/json" }),
  }));
  expect(reviewBody.parse(body)).toMatchObject(body);
  expect(reviewBody.safeParse({ text: 42 }).success).toBe(false);
});

it("generated job queries encode filters and preserve shared API errors", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unauthorized", { status: 401 }));
  await expect(wordListJobs({ status: "running", type: "review & draft" }, { token: "expired" })).rejects.toMatchObject({ status: 401, isAuthError: true });
  expect(fetch.mock.calls[0]?.[0]).toMatch(/\/jobs\?status=running&type=review\+%26\+draft$/);
});

it("public account and job aliases preserve the generated contract exactly", () => {
  const temporary = mkdtempSync(join(root, ".api-generation-"));
  try {
    const fixture = join(temporary, "contract-types.ts");
    writeFileSync(fixture, `
      import type * as Public from "@/types/api";
      import type * as Contract from "@/api/generated/client";
      type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
        (<T>() => T extends B ? 1 : 2) ? true : false;
      type Assert<T extends true> = T;
      export type Checks = [
        Assert<Equal<Public.JobCreated, Contract.JobCreatedResponse>>,
        Assert<Equal<Public.Job, Contract.JobResponse>>,
        Assert<Equal<Public.MeUser, Contract.MeUser>>,
        Assert<Equal<Public.MeOrg, Contract.MeOrg>>,
        Assert<Equal<Public.MeResponse, Contract.MeResponse>>,
      ];
    `);
    const config = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
    const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram([fixture], { ...options, noEmit: true });
    const errors = ts.getPreEmitDiagnostics(program).filter((error) => error.file?.fileName === fixture);
    expect(errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))).toEqual([]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

it("paid review and full analysis poll the jobId returned by the contract", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname.replace(/^\/api\/v4\/api\/v1(?=\/)/, "");
    if (path === "/review" || path === "/research") {
      return new Response(JSON.stringify({ jobId: path.slice(1), pollUrl: `/jobs${path}` }));
    }
    if (path === "/jobs/review" || path === "/jobs/research") {
      return new Response(JSON.stringify({ id: path.split("/").pop(), status: "completed", type: "review", createdAt: "2026-10-28T00:00:00Z" }));
    }
    if (path === "/jobs/review/result") {
      return new Response(JSON.stringify({ status: "completed", result: { summary: "Reviewed", issues: [] } }));
    }
    if (path === "/jobs/research/result") {
      return new Response(JSON.stringify({ status: "completed", result: { report: "Researched" } }));
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  await expect(reviewPaid("Contract", "token")).resolves.toEqual({ summary: "Reviewed", issues: [] });
  await expect(runFullAnalysis("Contract", "token")).resolves.toEqual({
    review: { summary: "Reviewed", issues: [] }, research: { report: "Researched" },
  });
});
