#!/usr/bin/env node
// ABOUTME: Fails when src/types/api.ts (or an api/*.ts module's own types) drift from
// ABOUTME: openapi.json — checked both ways via a maintained field manifest below.

import ts from "typescript";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each entry pins one TS interface, actually used by a call site, to the OpenAPI schema
// it represents. `fields` is the manifest: it must equal the TS interface's own field
// set exactly for handwritten interfaces, and be a subset of the contract schema's fields. A rename on either side
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

/** Resolve local interfaces and aliases through the committed generated contract. */
function extractTypeFields(program, checker, file, name) {
  const source = program.getSourceFile(join(ROOT, file));
  const module = checker.getSymbolAtLocation(source);
  const exported = checker.getExportsOfModule(module).find((symbol) => symbol.name === name);
  const declaration = source.statements.find((node) =>
    (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === name,
  );
  if (!exported && !declaration) throw new Error(`type ${name} not found in ${file}`);
  const symbol = exported && (exported.flags & ts.SymbolFlags.Alias)
    ? checker.getAliasedSymbol(exported) : exported;
  const type = symbol ? checker.getDeclaredTypeOfSymbol(symbol) : checker.getTypeAtLocation(declaration);
  return {
    fields: checker.getPropertiesOfType(type).map((property) => property.name),
    localInterface: declaration && ts.isInterfaceDeclaration(declaration),
  };
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
  const program = ts.createProgram([...new Set(MANIFEST.map((entry) => join(ROOT, entry.tsFile)))], {
    noEmit: true,
    baseUrl: ROOT,
    paths: { "@/*": ["src/*"] },
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const failures = [];

  for (const entry of MANIFEST) {
    const { fields: tsFields, localInterface } = extractTypeFields(program, checker, entry.tsFile, entry.tsType);
    const contractFields = schemaFields(spec, entry.schema);

    // Handwritten interfaces pin their complete field set. Aliases may select a
    // schema subset, but must expose every consumed field and only contract keys.
    const tsVsManifest = localInterface
      ? [...setDiff(tsFields, entry.fields), ...setDiff(entry.fields, tsFields)]
      : [...setDiff(tsFields, contractFields), ...setDiff(entry.fields, tsFields)];
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
    process.exit(1);
  }

  console.log(`Contract drift check passed — ${MANIFEST.length} types pinned against openapi.json ${spec.info?.version ?? "?"}.`);
}

main();
