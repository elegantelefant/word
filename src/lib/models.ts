// ABOUTME: Gemini model list shared by the settings UI and the review agent.
// ABOUTME: Kept separate from lib/agent so consumers do not pull in @google/adk.

// Stable text models with a free tier, from https://aistudio.google.com/docs/models,
// /docs/pricing and /docs/deprecations, read 2026-11-17. `pnpm check:models` asks
// Google's models.list API, with a key, whether each one is still served.
export const GEMINI_MODELS = [
  { id: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
] as const;

export const DEFAULT_MODEL = GEMINI_MODELS[0].id;

export function isListedModel(id: string): boolean {
  return GEMINI_MODELS.some((model) => model.id === id);
}
