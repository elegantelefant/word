// ABOUTME: Shim for @google/adk that imports only browser-safe modules.
// ABOUTME: Avoids apigee_llm.js which has an esbuild-incompatible super-in-async-generator.

// @ts-expect-error — deep imports from web build, no type declarations
export { LlmAgent } from "../../node_modules/@google/adk/dist/web/agents/llm_agent.js";
// @ts-expect-error
export { InMemoryRunner } from "../../node_modules/@google/adk/dist/web/runner/in_memory_runner.js";
// @ts-expect-error
export { Gemini } from "../../node_modules/@google/adk/dist/web/models/google_llm.js";
// @ts-expect-error
export { BaseLlm } from "../../node_modules/@google/adk/dist/web/models/base_llm.js";
