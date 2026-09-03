// ABOUTME: Gemini model list shared by the settings UI and the review agent.
// ABOUTME: Kept separate from lib/agent so consumers do not pull in @google/adk.

export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;

export const DEFAULT_MODEL = GEMINI_MODELS[0].id;
