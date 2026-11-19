#!/usr/bin/env node
// ABOUTME: Fails when a model in src/lib/models.ts is not served for generateContent,
// ABOUTME: asking Google's models.list API with the GEMINI_API_KEY from the environment.

import ts from "typescript";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// https://aistudio.google.com/api-reference/models/list-models.md (read 2026-11-17)
const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const PAGE_SIZE = 1000;

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("Set GEMINI_API_KEY to a Gemini API key; this check asks Google's models.list.");
  process.exit(2);
}

const source = readFileSync(join(ROOT, "src/lib/models.ts"), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { GEMINI_MODELS } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);

const served = new Set();
let pageToken = "";
do {
  const url = `${MODELS_URL}?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${pageToken}` : ""}`;
  const res = await fetch(url, { headers: { "x-goog-api-key": key } });
  if (!res.ok) throw new Error(`models.list returned ${res.status}: ${await res.text()}`);
  const page = await res.json();
  for (const model of page.models ?? []) {
    if (model.supportedGenerationMethods?.includes("generateContent")) served.add(model.name.replace(/^models\//, ""));
  }
  pageToken = page.nextPageToken ?? "";
} while (pageToken);

const missing = GEMINI_MODELS.filter((model) => !served.has(model.id));
for (const model of GEMINI_MODELS) console.log(`${served.has(model.id) ? "served " : "MISSING"} ${model.id}`);
if (missing.length) process.exit(1);
