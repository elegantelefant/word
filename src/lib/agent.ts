// ABOUTME: ADK-JS review agent that runs entirely in the browser.
// ABOUTME: Uses Gemini via user's API key (BYOK) for free-tier document review.

import { LlmAgent, InMemoryRunner } from "@google/adk";
import { z } from "zod";

const REVIEW_SYSTEM_PROMPT = `You are a legal document reviewer. Analyze the provided text and return a structured review.

For each issue found, classify it as one of:
- risk: potential legal risk or liability
- ambiguity: unclear or ambiguous language
- missing: missing clause or provision
- style: drafting style or consistency issue
- other: other notable observation

Be thorough but concise. Focus on actionable findings.`;

export const reviewSchema = z.object({
  summary: z.string().describe("Brief overall assessment of the document"),
  issues: z.array(
    z.object({
      message: z.string().describe("Description of the issue"),
      kind: z.enum(["risk", "ambiguity", "missing", "style", "other"]),
      location: z.string().optional().describe("Where in the text this issue appears"),
      suggestion: z.string().optional().describe("Suggested fix or improvement"),
    }),
  ),
});

export type ReviewResult = z.infer<typeof reviewSchema>;

import { DEFAULT_MODEL } from "./models";
import { createGemini } from "./gemini";

export function createReviewRunner(apiKey: string, model: string = DEFAULT_MODEL) {
  const llm = createGemini(apiKey, model);

  const agent = new LlmAgent({
    name: "legal_reviewer",
    model: llm,
    instruction: REVIEW_SYSTEM_PROMPT,
    outputSchema: reviewSchema,
    outputKey: "review_result",
  });
  return new InMemoryRunner({ agent, appName: "elefant" });
}

/** Turns an ADK error event into a message that says what actually happened. */
function describeReviewError(errorCode: string | undefined, errorMessage: string): string {
  if (errorCode === "400" && /api key/i.test(errorMessage)) {
    return "Your Gemini API key wasn't accepted. Check it in Settings.";
  }
  if (errorCode === "429") {
    return "Gemini's usage limit was reached. Try again in a little while.";
  }
  return `Gemini returned an error (code ${errorCode}). Try again.`;
}

export async function runReview(
  apiKey: string,
  model: string,
  text: string,
  instructions?: string,
): Promise<ReviewResult> {
  const runner = createReviewRunner(apiKey, model);
  const session = await runner.sessionService.createSession({
    appName: "elefant",
    userId: "user",
  });

  const prompt = instructions
    ? `${instructions}\n\n---\n\nDocument text:\n${text}`
    : `Review the following document:\n\n${text}`;

  let result: ReviewResult | null = null;

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: prompt }] },
  })) {
    if (event.errorMessage !== undefined) {
      throw new Error(describeReviewError(event.errorCode, event.errorMessage));
    }
    if (event.actions?.stateDelta?.review_result) {
      result = event.actions.stateDelta.review_result as ReviewResult;
    }
  }

  if (!result) {
    throw new Error("Agent did not return a structured review result");
  }

  return result;
}
