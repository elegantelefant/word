#!/usr/bin/env node
// ABOUTME: Fails when src/types/api.ts (or an api/*.ts module's own types) drift from
// ABOUTME: openapi.json — checked both ways via a maintained field manifest below.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each entry pins one TS interface, actually used by a call site, to the OpenAPI schema
// it represents. `fields` is the manifest: it must equal the TS interface's own field
// set exactly, and be a subset of the contract schema's fields. A rename on either side
// breaks one of those two checks.
const MANIFEST = [
  { tsFile: "src/types/api.ts", tsType: "MeUser", schema: "MeUser", fields: ["id", "email", "name"] },
  { tsFile: "src/types/api.ts", tsType: "MeOrg", schema: "MeOrg", fields: ["id", "name", "slug", "accountType"] },
  { tsFile: "src/types/api.ts", tsType: "MeResponse", schema: "MeResponse", fields: ["user", "org"] },
  { tsFile: "src/types/api.ts", tsType: "ReviewRequest", schema: "ReviewRequest", fields: ["text", "instructions", "context"] },
  { tsFile: "src/types/api.ts", tsType: "ReviewIssue", schema: "ReviewIssueResult", fields: ["category", "severity", "recommendation", "clauseReference", "sourceFilename", "description", "explanation"] },
  { tsFile: "src/types/api.ts", tsType: "ReviewResponse", schema: "ReviewResult", fields: ["summary", "issues"] },
  { tsFile: "src/types/api.ts", tsType: "ResearchRequest", schema: "ResearchRequest", fields: ["question"] },
  { tsFile: "src/types/api.ts", tsType: "JobCreated", schema: "JobCreatedResponse", fields: ["jobId", "pollUrl", "status"] },
  { tsFile: "src/types/api.ts", tsType: "Job", schema: "JobResponse", fields: ["id", "type", "status", "createdAt", "query", "error"] },
  { tsFile: "src/types/api.ts", tsType: "JobResult", schema: "JobResultResponse", fields: ["id", "status", "result"] },
  { tsFile: "src/api/clauses.ts", tsType: "ClauseDatabase", schema: "ClauseDatabaseResponse", fields: ["id", "name", "clauseCount"] },
  { tsFile: "src/api/clauses.ts", tsType: "Clause", schema: "ClauseResponse", fields: ["id", "name", "content", "category", "tags", "createdAt"] },
  { tsFile: "src/api/mammoth.ts", tsType: "LegalRequest", schema: "LegalRequestResponse", fields: ["id", "requestType", "status", "priority", "title", "description", "category", "result", "error", "createdAt", "updatedAt"] },
  { tsFile: "src/api/mammoth.ts", tsType: "CreateLegalRequest", schema: "LegalRequestCreateRequest", fields: ["requestType", "title", "description", "category", "priority"] },
  { tsFile: "src/api/jobs.ts", tsType: "JobListResponse", schema: "JobListResponse", fields: ["jobs"] },
  { tsFile: "src/api/clauses.ts", tsType: "ClauseDatabaseListResponse", schema: "ClauseDatabaseListResponse", fields: ["databases"] },
  { tsFile: "src/api/clauses.ts", tsType: "ClauseListResponse", schema: "ClauseListResponse", fields: ["clauses"] },
  { tsFile: "src/api/mammoth.ts", tsType: "LegalRequestListResponse", schema: "LegalRequestListResponse", fields: ["requests", "total"] },
];

/** Extracts the top-level field names of `interface <name> { ... }` from TS source. */
function extractInterfaceFields(source, name) {
  const start = source.match(new RegExp(`interface\\s+${name}\\s*\\{`));
  if (!start) throw new Error(`interface ${name} not found`);

  let i = start.index + start[0].length;
  let depth = 1;
  const bodyStart = i;
  while (depth > 0 && i < source.length) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    i++;
  }
  const body = source.slice(bodyStart, i - 1);

  const fields = [];
  let d = 0;
  let atFieldStart = true;
  let j = 0;
  while (j < body.length) {
    if (d === 0 && atFieldStart) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/.exec(body.slice(j));
      if (m) {
        fields.push(m[1]);
        j += m[0].length;
        atFieldStart = false;
        continue;
      }
      const skip = /^(\s+|\/\/[^\n]*)/.exec(body.slice(j));
      if (skip) {
        j += skip[0].length;
        continue;
      }
    }
    const ch = body[j];
    if (ch === "{" || ch === "[" || ch === "(") d++;
    else if (ch === "}" || ch === "]" || ch === ")") d--;
    else if ((ch === ";" || ch === ",") && d === 0) atFieldStart = true;
    j++;
  }
  return fields;
}

function schemaFields(spec, name) {
  const schema = spec.components?.schemas?.[name];
  if (!schema) throw new Error(`schema ${name} not found in openapi.json`);
  if (!schema.properties) throw new Error(`schema ${name} has no properties`);
  return Object.keys(schema.properties);
}

function setDiff(a, b) {
  return a.filter((x) => !b.includes(x));
}

function main() {
  const spec = JSON.parse(readFileSync(join(ROOT, "openapi.json"), "utf8"));
  const fileCache = new Map();
  const failures = [];

  for (const entry of MANIFEST) {
    if (!fileCache.has(entry.tsFile)) {
      fileCache.set(entry.tsFile, readFileSync(join(ROOT, entry.tsFile), "utf8"));
    }
    const tsFields = extractInterfaceFields(fileCache.get(entry.tsFile), entry.tsType);
    const contractFields = schemaFields(spec, entry.schema);

    const tsVsManifest = [...setDiff(tsFields, entry.fields), ...setDiff(entry.fields, tsFields)];
    if (tsVsManifest.length > 0) {
      failures.push(
        `${entry.tsFile}: interface ${entry.tsType} fields [${tsFields.join(", ")}] ` +
          `no longer match the manifest [${entry.fields.join(", ")}] (diff: ${tsVsManifest.join(", ")})`,
      );
    }

    const manifestVsContract = setDiff(entry.fields, contractFields);
    if (manifestVsContract.length > 0) {
      failures.push(
        `${entry.schema}: manifest field(s) [${manifestVsContract.join(", ")}] no longer exist on the ` +
          `contract schema (has: [${contractFields.join(", ")}]) — ${entry.tsType} in ${entry.tsFile} is stale`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`Contract drift detected (${failures.length}):\n`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(`\nSee agent_docs/2026-09-22-w0-callsite-inventory.md for the shapes this pins.`);
    process.exit(1);
  }

  console.log(`Contract drift check passed — ${MANIFEST.length} types pinned against openapi.json ${spec.info?.version ?? "?"}.`);
}

main();
