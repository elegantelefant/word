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

export function modelLabel(id: string): string {
  return GEMINI_MODELS.find((model) => model.id === id)?.label ?? id;
}

/** Says which model answered when it was not the one chosen in Settings; null when it was. */
export function fallbackNote(chosen: string, answeredBy: string | undefined): string | null {
  return answeredBy && answeredBy !== chosen ? `${modelLabel(chosen)} was busy, so ${modelLabel(answeredBy)} answered.` : null;
}

export function isListedModel(id: string): boolean {
  return GEMINI_MODELS.some((model) => model.id === id);
}
