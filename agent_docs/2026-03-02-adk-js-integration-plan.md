# ADK-JS Integration Plan — BYOK Review Agent in Browser

## Context

Replace the current `gateway.ts` (which calls a nonexistent `/v1/chat/completions` endpoint)
with a real client-side agent framework using Google ADK-JS. The agent runs entirely in the
browser (Word task pane webview), using the user's own API key. No backend needed for free tier.

## Architecture

```
Free tier:  Word Plugin → ADK-JS (in browser) → LLM provider API → structured review
Paid tier:  Word Plugin → Elefant API (unchanged) → Pydantic AI → job → result
```

## Key Decision: Model Provider

ADK-JS only ships Gemini + Apigee adapters natively. For Anthropic/OpenAI we must write
a custom `BaseLlm` adapter. Two viable approaches:

### Option 1: Gemini-only for free tier (recommended for MVP)
- Use `new Gemini({ apiKey })` — works out of the box in browser
- Free users get a Gemini API key from Google AI Studio (free tier available)
- Simplest path, least risk, ships fastest
- Add Anthropic/OpenAI adapters later

### Option 2: Custom BaseLlm adapters for all providers
- Write `AnthropicLlm` and `OpenAiLlm` extending `BaseLlm`
- Must translate between `@google/genai` content format and provider APIs
- More work upfront, broader user base
- CORS may be an issue (Anthropic API doesn't set CORS headers for browser calls)

**Recommendation: Start with Option 1 (Gemini only), add adapters in a follow-up.**

CORS is the real blocker for Option 2 — Anthropic's API returns no `Access-Control-Allow-Origin`
header, so browser-direct calls fail. Gemini API does support browser CORS. OpenAI also allows
browser calls but discourage it (key exposure). Gemini is the cleanest path.

## Spike Plan (Phase 1: Proof of concept)

### Step 1: Install + bundle size check
```bash
pnpm add @google/adk zod@4
```
- Check: does Vite resolve the browser entry (`dist/web/index_web.js`)?
- Check: what's the bundle size impact? (current: 69KB gzipped)
- Check: any build errors from mikro-orm/google-auth-library transitive deps?

### Step 2: Minimal agent — hello world
Create `src/lib/agent.ts`:
```typescript
import { LlmAgent, InMemoryRunner, Gemini } from '@google/adk';

export function createReviewRunner(apiKey: string) {
  const model = new Gemini({ model: 'gemini-2.5-flash', apiKey });
  const agent = new LlmAgent({
    name: 'reviewer',
    model,
    instruction: 'You review legal documents.',
  });
  return new InMemoryRunner({ agent, appName: 'elefant' });
}
```
- Check: does `InMemoryRunner` instantiate without errors in browser?
- Check: does `createSession` work?
- Check: does `runAsync` send a request to Gemini and return events?

### Step 3: Structured review agent
Define the review agent with output schema and tools:
```typescript
const reviewSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    message: z.string(),
    kind: z.enum(['risk', 'ambiguity', 'missing', 'style', 'other']),
    location: z.string().optional(),
    suggestion: z.string().optional(),
  })),
});

const agent = new LlmAgent({
  name: 'legal_reviewer',
  model,
  instruction: REVIEW_SYSTEM_PROMPT,
  outputSchema: reviewSchema,
  outputKey: 'review_result',
});
```
- Check: does structured output work with Gemini 2.5 Flash?
- Check: does the parsed result match our `ReviewResponse` type?

### Step 4: Wire into ReviewPanel
Replace `reviewFree()` call path:
- Instead of `reviewViaGateway()`, call the ADK runner
- Parse events, extract final text/structured output
- Display in existing ReviewResults component

### Step 5: Streaming (optional enhancement)
- Use `StreamingMode.SSE` in RunConfig
- Update ReviewPanel to show progressive results
- Partial events → update summary in real-time

## Implementation Plan (Phase 2: Full integration)

### Files to create
- `src/lib/agent.ts` — review agent definition + runner factory
- `src/lib/models/gemini.ts` — Gemini model wrapper (thin, just passes apiKey)

### Files to modify
- `src/api/gateway.ts` → rename to `src/api/review-free.ts`, replace internals with ADK
- `src/api/review.ts` → update `reviewFree()` to use ADK runner
- `src/store/settings.ts` → model picker shows Gemini models only (for now)
- `src/components/SettingsPanel.tsx` → update model list
- `src/components/panels/ReviewPanel.tsx` → handle streaming events

### Files to delete
- None (gateway.ts gets repurposed)

### Types alignment
ADK uses `@google/genai` Content format. Our `ReviewResponse` type stays the same.
The bridge is in the agent's `outputSchema` — ADK parses the LLM JSON output into
a typed object that matches our existing interface.

```
ADK outputSchema (Zod) → LLM returns JSON → ADK parses → matches ReviewResponse
```

### Settings changes
Current model list:
- Claude Sonnet 4, Claude Haiku 4.5, GPT-4o, GPT-4o Mini

New model list (Gemini only for now):
- Gemini 2.5 Flash (default, fast + cheap)
- Gemini 2.5 Pro (higher quality)
- Gemini 2.0 Flash (fallback)

### Session management
- Use `InMemoryRunner` — no persistence needed (review is one-shot)
- Use `runEphemeral()` for each review — creates temp session, runs, cleans up
- No need for session persistence across reviews

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size bloat | High | Tree-shake; check Vite handles `browser` field; measure before/after |
| Zod v4 conflict | Medium | We don't use Zod yet; install v4 fresh |
| ADK API instability (v0.4) | Medium | Pin exact version; wrap in our own thin interface |
| Gemini-only limits free tier | Low | Gemini free tier is generous; add Anthropic/OpenAI adapters later |
| `outputSchema` + tools unreliable | Medium | Test without tools first; structured output only |
| Office webview CSP blocks Gemini | Low | Test in actual Word; Gemini API uses standard HTTPS |

## Success Criteria

1. `pnpm dev` → open in browser → enter Gemini key → select text → get structured review
2. Bundle size < 150KB gzipped (currently 69KB)
3. Review quality comparable to current prompt-based approach
4. All existing tests still pass
5. Streaming shows progressive results in ReviewPanel

## Future: Anthropic/OpenAI Adapter

When ready to support non-Gemini models:

```typescript
class AnthropicLlm extends BaseLlm {
  static override readonly supportedModels = [/anthropic\/.*/];
  private apiKey: string;

  constructor({ model, apiKey }: { model: string; apiKey: string }) {
    super({ model });
    this.apiKey = apiKey;
  }

  async *generateContentAsync(req: LlmRequest, stream?: boolean) {
    // 1. Convert LlmRequest (Gemini Content[]) → Anthropic messages format
    // 2. POST to api.anthropic.com/v1/messages (needs CORS proxy!)
    // 3. Convert Anthropic response → LlmResponse
    // 4. yield response
  }
}
```

**CORS blocker**: Anthropic API doesn't allow browser-origin requests.
Solutions: (a) CORS proxy, (b) service worker, (c) keep it Gemini-only in browser.
This is why Gemini-first is the right call.
