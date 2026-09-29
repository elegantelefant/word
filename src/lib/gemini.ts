// ABOUTME: Builds the free-tier Gemini model, which talks to Google's own endpoint by default.
// ABOUTME: VITE_GEMINI_BASE_URL opts into a proxy; the user's key and document then go through that host.

import { Gemini } from "@google/adk";
import { DEFAULT_MODEL } from "./models";

const GEMINI_BASE_URL = import.meta.env.VITE_GEMINI_BASE_URL || "";

export function createGemini(apiKey: string, model: string = DEFAULT_MODEL): Gemini {
  const llm = new Gemini({ model, apiKey });

  if (GEMINI_BASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = llm as any;
    const orig = target.getHttpOptions.bind(llm);
    target.getHttpOptions = () => ({ ...orig(), baseUrl: GEMINI_BASE_URL });
  }

  return llm;
}
