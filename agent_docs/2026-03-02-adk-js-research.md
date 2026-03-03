# Google ADK-JS (Agent Development Kit for TypeScript) - Research

Date: 2026-03-02
Package: `@google/adk` v0.4.0
License: Apache-2.0
Repo: https://github.com/google/adk-js

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Architecture Overview](#architecture-overview)
3. [Browser Support](#browser-support)
4. [LlmAgent API](#llmagent-api)
5. [Model Providers](#model-providers)
6. [Non-Google Models (Critical)](#non-google-models-critical)
7. [FunctionTool API](#functiontool-api)
8. [Custom Tools & ToolContext](#custom-tools--toolcontext)
9. [Sessions & State](#sessions--state)
10. [Runner & InMemoryRunner](#runner--inmemoryrunner)
11. [Event Loop & Streaming](#event-loop--streaming)
12. [Custom Agents](#custom-agents)
13. [Structured Output](#structured-output)
14. [Minimal Integration Example](#minimal-integration-example)
15. [Key Answers to Specific Questions](#key-answers)
16. [Risks & Limitations for Word Add-in](#risks--limitations)

---

## 1. Installation & Setup

```bash
npm install @google/adk    # core library
npm install -D @google/adk-devtools  # CLI (adk run, adk web)
```

Requirements: Node.js >= 24.13.0, npm >= 11.8.0 (for CLI tools).

### Dependencies (core package)

| Dependency | Version |
|---|---|
| `@google/genai` | ^1.37.0 |
| `@a2a-js/sdk` | ^0.3.10 |
| `@mikro-orm/core` | ^6.6.6 |
| `@mikro-orm/reflection` | ^6.6.6 |
| `@modelcontextprotocol/sdk` | ^1.26.0 |
| `google-auth-library` | ^10.3.0 |
| `lodash-es` | ^4.17.23 |
| `zod` | ^4.2.1 |
| `zod-to-json-schema` | ^3.25.1 |

Peer dependencies: Database adapters (mikro-orm), OpenTelemetry, Google Cloud exporters (all optional).

---

## 2. Architecture Overview

### Source Structure (`core/src/`)

```
core/src/
  agents/          # LlmAgent, SequentialAgent, LoopAgent, ParallelAgent, BaseAgent
  artifacts/       # InMemoryArtifactService, FileArtifactService, GcsArtifactService
  auth/            # Credential types (HTTP, OAuth2, service accounts)
  code_executors/  # BaseCodeExecutor, BuiltInCodeExecutor
  events/          # Event, EventActions, structured events
  examples/        # BaseExampleProvider
  memory/          # InMemoryMemoryService
  models/          # BaseLlm, Gemini, ApigeeLlm, LLMRegistry
  plugins/         # BasePlugin, LoggingPlugin, SecurityPlugin
  runner/          # Runner, InMemoryRunner
  sessions/        # Session, State, InMemorySessionService, DatabaseSessionService
  telemetry/       # Google Cloud telemetry
  tools/           # FunctionTool, AgentTool, GoogleSearchTool, MCP tools
  utils/           # Logger, schema conversion
  common.ts        # Re-exports everything for browser build
  index.ts         # Node.js entry: common + FileArtifactService + GcsArtifactService + DB sessions + MCP + telemetry
  index_web.ts     # Browser entry: just `export * from './common.js'`
```

### Build Outputs

The package provides three builds:
- **ESM** (`dist/esm/index.js`) - Node.js ES modules
- **CJS** (`dist/cjs/index.js`) - CommonJS
- **Web** (`dist/web/index_web.js`) - Browser-compatible ESM

package.json conditional exports:
```json
{
  "types": "./dist/types/index.d.ts",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "browser": "./dist/web/index_web.js"
}
```

---

## 3. Browser Support

### What's Available in Browser

The `index_web.ts` entry re-exports from `common.ts`, which includes:

**Available in browser:**
- `LlmAgent`, `BaseAgent`, `SequentialAgent`, `LoopAgent`, `ParallelAgent`
- `InMemoryRunner`, `Runner`
- `InMemorySessionService`, `InMemoryArtifactService`, `InMemoryMemoryService`
- `FunctionTool`, `AgentTool`, `BaseTool`, `LongRunningFunctionTool`, `GoogleSearchTool`
- `Gemini`, `ApigeeLlm`, `BaseLlm`, `LLMRegistry`
- `CallbackContext`, `InvocationContext`, `ReadonlyContext`, `ToolContext`
- Event utilities, plugin system, auth credential types
- `RunConfig`, `StreamingMode`

**NOT available in browser (Node-only):**
- `FileArtifactService` (filesystem)
- `GcsArtifactService` (Google Cloud Storage)
- `DatabaseSessionService` (mikro-orm/SQLite)
- MCP tools (`McpTool`, `McpToolset`, `McpSessionManager`)
- Google Cloud telemetry

### Build Targets

Browser build targets: Chrome 58, Firefox 57, Safari 11.
Dependencies are marked external (not bundled) -- consumer must provide them.

### Environment Variable Handling

The `Gemini` class reads env vars only in non-browser environments:
```typescript
// In google_llm.ts - env vars only read when NOT in browser
if (!isBrowser()) {
  apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
}
```

For browser usage, you MUST pass the API key explicitly:
```typescript
const agent = new LlmAgent({
  model: new Gemini({ model: 'gemini-2.5-flash', apiKey: 'YOUR_KEY' }),
  // ...
});
```

---

## 4. LlmAgent API

### Constructor (LlmAgentConfig)

```typescript
import { LlmAgent } from '@google/adk';

const agent = new LlmAgent({
  // Required
  name: string,                    // Unique identifier; avoid "user"

  // Model (string resolved via LLMRegistry, or BaseLlm instance)
  model: string | BaseLlm,        // e.g. 'gemini-2.5-flash' or new Gemini({...})

  // Behavior
  description?: string,            // Capabilities summary (for multi-agent routing)
  instruction?: string | InstructionProvider,  // Task/persona/constraints
  globalInstruction?: string | InstructionProvider,  // System-wide (root agent only)
  includeContents?: 'default' | 'none',  // History access ('none' = stateless)

  // Tools
  tools?: ToolUnion[],             // FunctionTool[], AgentTool[], etc.

  // Structured I/O
  inputSchema?: ZodObject | Schema,
  outputSchema?: ZodObject | Schema,   // Forces JSON output conformance
  outputKey?: string,                  // State key to store final response

  // Generation control
  generateContentConfig?: GenerateContentConfig,  // temperature, maxOutputTokens, etc.

  // Callbacks
  beforeModelCallback?: Function,
  afterModelCallback?: Function,
  beforeToolCallback?: Function,
  afterToolCallback?: Function,

  // Sub-agents
  subAgents?: BaseAgent[],

  // Advanced
  planner?: BuiltInPlanner | PlanReActPlanner,
  codeExecutor?: BaseCodeExecutor,
  disallowTransferToParent?: boolean,
  disallowTransferToPeers?: boolean,
  requestProcessors?: BaseLlmRequestProcessor[],
  responseProcessors?: BaseLlmResponseProcessor[],
});
```

### Instruction Templating

State variables inject via `{varName}`:
```typescript
instruction: 'Write a story about {topic}. Style: {user:preferred_style}'
```
- `{var}` - session state
- `{user:var}` - user state
- `{app:var}` - app state
- `{artifact.name}` - artifact content
- `{var?}` - optional (no error if missing)

### Model Resolution (cascading)

1. If `model` is a `BaseLlm` instance, use directly
2. If `model` is a string, call `LLMRegistry.newLlm(model)` to resolve
3. If no model set, traverse parent agents recursively
4. Error if no model found in the tree

### GenerateContentConfig

```typescript
generateContentConfig: {
  temperature: 0.2,        // 0 = deterministic, 1+ = creative
  maxOutputTokens: 2048,
  topP: 0.95,
  topK: 40,
  safetySettings: [...],
}
```

---

## 5. Model Providers

### Built-in Registry (TypeScript)

Only two providers are registered by default:
1. **Gemini** - matches `/gemini-.*/` and Vertex AI endpoint patterns
2. **ApigeeLlm** - for Apigee-managed models

### Gemini Configuration

```typescript
// Via environment variables (Node.js only)
// GEMINI_API_KEY or GOOGLE_GENAI_API_KEY

// Via explicit constructor (works in browser)
import { Gemini } from '@google/adk';

const model = new Gemini({
  model: 'gemini-2.5-flash',    // default
  apiKey: 'YOUR_API_KEY',       // required in browser
  // Vertex AI mode (optional):
  vertexai: true,
  project: 'my-project',
  location: 'us-central1',
  headers: {},                  // custom headers
});

const agent = new LlmAgent({
  model: model,
  // or just model: 'gemini-2.5-flash' in Node with env vars
});
```

### Environment Variables for Gemini

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | API key for Google AI Studio |
| `GOOGLE_GENAI_API_KEY` | Alternative API key variable |
| `GOOGLE_GENAI_USE_VERTEXAI` | Enable Vertex AI mode |
| `GOOGLE_CLOUD_PROJECT` | Vertex AI project ID |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI location |

---

## 6. Non-Google Models (Critical)

### Current State (March 2026)

**The official `@google/adk` TypeScript package does NOT have built-in support for Anthropic, OpenAI, or LiteLLM.**

- LiteLLM integration exists in the **Python** ADK only
- Anthropic direct integration exists in the **Java** ADK only
- The TypeScript ADK only ships with Gemini and Apigee adapters

### GitHub Issue Status

- **Issue #23** (Open): "Support for other LLM Models" - Google team says "on our radar"
- **Issue #45** (Closed): LiteLLM support requested, resolved via community package

### Community Solution: Custom BaseLlm Subclass

The `LLMRegistry.register()` pattern allows custom model adapters:

```typescript
import { LlmAgent, LLMRegistry } from '@google/adk';
import { AIGatewayLlm } from 'adk-llm-bridge';

// Register the custom adapter
LLMRegistry.register(AIGatewayLlm);

// Now use Anthropic/OpenAI model strings
const agent = new LlmAgent({
  name: 'myAgent',
  model: 'anthropic/claude-sonnet-4-20250514',
  instruction: '...',
});
```

### Writing Your Own BaseLlm Adapter

```typescript
import { BaseLlm, LlmRequest, LlmResponse, BaseLlmConnection } from '@google/adk';

class CustomLlm extends BaseLlm {
  static override readonly supportedModels: Array<string | RegExp> = [
    /anthropic\/.*/,
    /openai\/.*/,
  ];

  constructor({ model }: { model: string }) {
    super({ model });
  }

  async *generateContentAsync(
    llmRequest: LlmRequest,
    stream?: boolean,
  ): AsyncGenerator<LlmResponse, void> {
    // Convert LlmRequest to your provider's format
    // Call the provider API
    // Yield LlmResponse objects
  }

  async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
    // For live/streaming connections
    throw new Error('Not implemented');
  }
}

LLMRegistry.register(CustomLlm);
```

### What You Need to Know About BaseLlm

```typescript
abstract class BaseLlm {
  readonly model: string;
  static readonly supportedModels: Array<string | RegExp> = [];

  constructor({ model }: { model: string });

  // Core: yield LlmResponse objects (streaming or single)
  abstract generateContentAsync(
    llmRequest: LlmRequest,
    stream?: boolean,
  ): AsyncGenerator<LlmResponse, void>;

  // For live bidirectional connections
  abstract connect(llmRequest: LlmRequest): Promise<BaseLlmConnection>;

  // Utility
  protected get trackingHeaders(): Record<string, string>;
  maybeAppendUserContent(llmRequest: LlmRequest): void;
}
```

---

## 7. FunctionTool API

### Constructor

```typescript
import { FunctionTool } from '@google/adk';
import { z } from 'zod';

const tool = new FunctionTool({
  name: string,                // Optional: defaults to execute function name
  description: string,         // Required: tells LLM when to use it
  parameters: ZodSchema,       // Zod object schema for input validation
  execute: ToolExecuteFunction, // The function to call
  isLongRunning?: boolean,     // For extended operations
});
```

### Parameter Definition with Zod

```typescript
const params = z.object({
  city: z.string().describe('The city name'),
  unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit').optional(),
});
```

Zod schemas auto-convert to JSON Schema for the LLM via `zodObjectToSchema()`.

### Execute Function Signature

```typescript
type ToolExecuteFunction = (
  input: InferredFromZod,        // Validated args matching Zod schema
  toolContext?: ToolContext,      // Optional: framework injects automatically
) => Promise<unknown> | unknown; // Return object preferred
```

### Return Values

Return `Record<string, unknown>` (objects with string keys). Include status:
```typescript
return { status: 'success', data: { temperature: 72, unit: 'F' } };
return { status: 'error', message: 'City not found' };
```

### Complete Example

```typescript
const getWeather = new FunctionTool({
  name: 'get_weather',
  description: 'Gets current weather for a city.',
  parameters: z.object({
    city: z.string().describe('The city name'),
  }),
  execute: async ({ city }, toolContext) => {
    // toolContext gives access to state, artifacts, auth
    const prefs = toolContext?.state.get('user:temp_unit', 'celsius');
    const data = await fetchWeather(city, prefs);
    return { status: 'success', temperature: data.temp, unit: prefs };
  },
});
```

---

## 8. Custom Tools & ToolContext

### ToolContext Capabilities

When a tool includes `toolContext` parameter, ADK injects it automatically:

```typescript
// State access
const val = toolContext.state.get('key', defaultValue);
toolContext.state.set('key', newValue);
toolContext.state.set('user:preference', value);  // user-scoped
toolContext.state.set('temp:intermediate', value); // temp (invocation-scoped)

// Artifacts
const artifacts = await toolContext.listArtifacts();
const doc = await toolContext.loadArtifact('report.txt');
const version = await toolContext.saveArtifact('analysis.txt', part);

// Memory search
const results = await toolContext.searchMemory('query');

// Authentication
const authResponse = toolContext.getAuthResponse();
toolContext.requestCredential({ /* authConfig */ });

// Agent flow control
toolContext.actions.transferToAgent = 'other_agent_name';
toolContext.actions.escalate = true;  // pass to parent
toolContext.actions.skipSummarization = true;  // bypass LLM summary
```

### Agent-as-Tool

```typescript
import { AgentTool } from '@google/adk';

const specialistTool = new AgentTool(specialistAgent);
// Parent agent can delegate to specialist via tool call
```

---

## 9. Sessions & State

### Session Structure

A session represents one ongoing interaction. Contains:
- `id: string` - unique session identifier
- `appName: string` - application name
- `userId: string` - user identifier
- `state: Record<string, unknown>` - key-value state
- `events: Event[]` - chronological event history

### State Scopes (Prefixes)

| Prefix | Scope | Persists Across Sessions | Example |
|---|---|---|---|
| (none) | Session | No | `'current_step'` |
| `user:` | User | Yes (same userId) | `'user:preferred_language'` |
| `app:` | Application | Yes (all users) | `'app:global_discount'` |
| `temp:` | Invocation | No (discarded after turn) | `'temp:validation_result'` |

### InMemorySessionService

```typescript
import { InMemorySessionService } from '@google/adk';

const sessionService = new InMemorySessionService();

// Internal storage structure:
// sessions[appName][userId][sessionId] = Session
// userState[appName][userId] = Record<string, unknown>
// appState[appName] = Record<string, unknown>

// State merging order: appState -> userState -> sessionState (later overrides earlier)
```

Methods:
- `createSession({ appName, userId, sessionId? })` - creates new session
- `getSession({ appName, userId, sessionId, numRecentEvents?, afterTimestamp? })` - retrieves with optional filtering
- `listSessions({ appName, userId })` - list all sessions for user
- `deleteSession({ appName, userId, sessionId })` - remove session
- `appendEvent({ session, event })` - add event, commit state deltas

### Reading State in Instructions

```typescript
const agent = new LlmAgent({
  instruction: 'The user prefers {user:language}. Current step: {current_step}.',
  // ...
});
```

### Writing State via outputKey

```typescript
const agent = new LlmAgent({
  outputKey: 'last_greeting',  // Auto-stores LLM response text
  // ...
});
// After agent runs, session.state['last_greeting'] contains the response
```

### Writing State via EventActions

```typescript
import { createEventActions, createEvent } from '@google/adk';

const actions = createEventActions({
  stateDelta: {
    'task_status': 'active',
    'user:login_count': 1,
    'temp:validation_needed': true,
  },
});

const event = createEvent({
  invocationId: 'inv_123',
  author: 'system',
  actions: actions,
});

await sessionService.appendEvent({ session, event });
```

---

## 10. Runner & InMemoryRunner

### Runner (base class)

```typescript
import { Runner, RunConfig, StreamingMode } from '@google/adk';

const runner = new Runner({
  appName: string,                         // Required
  agent: BaseAgent,                        // Required
  sessionService: BaseSessionService,      // Required
  artifactService?: BaseArtifactService,
  memoryService?: BaseMemoryService,
  credentialService?: BaseCredentialService,
  plugins?: BasePlugin[],
});
```

### runAsync Method

```typescript
async *runAsync(params: {
  userId: string,
  sessionId: string,
  newMessage: Content,
  stateDelta?: Record<string, unknown>,
  runConfig?: RunConfig,
}): AsyncGenerator<Event, void, undefined>
```

Returns an async generator of `Event` objects. Consume with `for await`:

```typescript
for await (const event of runner.runAsync({
  userId: 'user1',
  sessionId: 'session1',
  newMessage: createUserContent('Hello'),
})) {
  if (event.content?.parts?.some(p => p.text)) {
    console.log(event.content.parts.find(p => p.text).text);
  }
}
```

### runEphemeral Method

Creates a temporary session, runs, then deletes it:
```typescript
// Useful for one-shot queries
for await (const event of runner.runEphemeral({
  userId: 'user1',
  newMessage: createUserContent('Hello'),
})) {
  // ...
}
```

### InMemoryRunner (convenience)

```typescript
import { InMemoryRunner } from '@google/adk';

const runner = new InMemoryRunner({
  agent: myAgent,              // Required: BaseAgent instance
  appName?: string,            // Default: 'InMemoryRunner'
  plugins?: BasePlugin[],      // Default: []
});
```

Internally creates:
- `InMemorySessionService`
- `InMemoryArtifactService`
- `InMemoryMemoryService`

No persistence. No server needed. Works in browser.

### RunConfig

```typescript
const config: RunConfig = {
  streamingMode: StreamingMode.NONE,  // NONE | SSE | BIDI
  maxLlmCalls: 500,                   // default 500; <=0 = unlimited
  saveInputBlobsAsArtifacts: false,
  supportCfc: false,                  // experimental compositional function calling
  speechConfig: { languageCode: 'en-US', voiceConfig: {...} },
  responseModalities: [{ modality: 'TEXT' }],
  outputAudioTranscription: undefined,
};
```

---

## 11. Event Loop & Streaming

### Core Event Loop

1. Runner receives user input, appends to session
2. Agent logic executes, yields `Event` when it needs to communicate
3. Agent **pauses** after yielding
4. Runner processes event (commits state_delta, artifact_delta)
5. Runner forwards event upstream (to UI/application)
6. Agent resumes

### Event Structure

```typescript
interface Event {
  content?: Content;           // Text, function calls, function responses
  actions?: EventActions;      // { stateDelta, artifactDelta }
  author: string;              // Which component generated it
  metadata?: {
    invocationId: string,
    partial: boolean,          // true = streaming chunk
    turnComplete: boolean,     // true = final event in turn
  };
}
```

### Streaming

Enable via RunConfig:
```typescript
const config: RunConfig = {
  streamingMode: StreamingMode.SSE,  // Server-Sent Events
};

for await (const event of runner.runAsync({
  userId: 'u1',
  sessionId: 's1',
  newMessage: createUserContent('Tell me a story'),
  runConfig: config,
})) {
  if (event.metadata?.partial) {
    // Streaming chunk - display immediately
    // State NOT committed for partial events
    process.stdout.write(event.content?.parts?.[0]?.text ?? '');
  } else {
    // Final event - state committed
    console.log('\n[Complete]');
  }
}
```

### Streaming Modes

| Mode | Direction | Use Case |
|---|---|---|
| `NONE` | N/A | Complete responses only (default) |
| `SSE` | Server -> Client | Progressive text display |
| `BIDI` | Both | Real-time voice/audio (Gemini Live) |

### Partial Event Semantics

- `partial=true`: Forwarded to UI immediately, state NOT committed, NOT saved to history
- `partial=false` or `turnComplete=true`: Fully processed, state committed atomically

---

## 12. Custom Agents

### Base Class

```typescript
import { BaseAgent, InvocationContext, Event } from '@google/adk';

class MyCustomAgent extends BaseAgent {
  async *runAsyncImpl(
    ctx: InvocationContext,
  ): AsyncGenerator<Event, void, undefined> {
    // Access state
    const val = ctx.session.state['some_key'];

    // Call sub-agents
    for await (const event of this.subAgents[0].runAsync(ctx)) {
      yield event;
    }

    // Custom control flow
    if (someCondition) {
      // ...
    }
  }

  // Also implement for live/streaming
  async *runLiveImpl(ctx: InvocationContext): AsyncGenerator<Event, void, undefined> {
    // ...
  }
}
```

### Built-in Orchestration Agents

- **SequentialAgent**: Runs sub-agents in order
- **ParallelAgent**: Runs sub-agents concurrently
- **LoopAgent**: Repeats sub-agents until `escalate` action

---

## 13. Structured Output

### Using outputSchema

```typescript
import { z } from 'zod';

const responseSchema = z.object({
  summary: z.string().describe('Brief summary'),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
});

const agent = new LlmAgent({
  name: 'analyzer',
  model: 'gemini-2.5-flash',
  instruction: 'Analyze the sentiment of the given text.',
  outputSchema: responseSchema,
  outputKey: 'analysis_result',  // Stores parsed JSON in state
});
```

### Constraints

- `outputSchema` + `tools` only works reliably on Gemini 3.0+
- When `outputSchema` is set, agent transfer is disabled (both parent and peer)
- The schema is converted from Zod to JSON Schema and passed to the LLM
- Results stored via `outputKey` are JSON-parsed (not raw text)

### Alternative: GenerateContentConfig

```typescript
const agent = new LlmAgent({
  model: 'gemini-2.5-flash',
  generateContentConfig: {
    responseMimeType: 'application/json',
    responseSchema: { /* JSON Schema */ },
  },
});
```

---

## 14. Minimal Integration Example

### Simplest Possible Agent (Browser-Compatible)

```typescript
import { LlmAgent, InMemoryRunner, Gemini, FunctionTool } from '@google/adk';
import { z } from 'zod';

// 1. Create model with explicit API key (browser)
const model = new Gemini({
  model: 'gemini-2.5-flash',
  apiKey: 'YOUR_GEMINI_API_KEY',
});

// 2. Define a tool
const analyzeTool = new FunctionTool({
  name: 'analyze_document',
  description: 'Analyzes the document text and returns structured feedback.',
  parameters: z.object({
    text: z.string().describe('The document text to analyze'),
    criteria: z.string().describe('What to analyze for'),
  }),
  execute: async ({ text, criteria }) => {
    return { status: 'success', analysis: `Analysis of: ${criteria}` };
  },
});

// 3. Create agent with structured output
const agent = new LlmAgent({
  name: 'document_agent',
  model: model,
  description: 'Analyzes documents and provides structured feedback.',
  instruction: 'You analyze documents. Use the analyze_document tool.',
  tools: [analyzeTool],
  outputKey: 'last_analysis',
});

// 4. Create in-memory runner (no server needed)
const runner = new InMemoryRunner({ agent });

// 5. Create session and run
const session = await runner.sessionService.createSession({
  appName: 'InMemoryRunner',
  userId: 'user1',
});

// 6. Send message and collect response
const events = runner.runAsync({
  userId: 'user1',
  sessionId: session.id,
  newMessage: { role: 'user', parts: [{ text: 'Analyze this paragraph...' }] },
});

let finalText = '';
for await (const event of events) {
  const textPart = event.content?.parts?.find(p => p.text);
  if (textPart && !event.metadata?.partial) {
    finalText = textPart.text;
  }
}
console.log(finalText);
```

---

## 15. Key Answers

### Can LlmAgent work with just an API key (no Google Cloud)?

**YES**, for Gemini models. Use `new Gemini({ apiKey: '...' })` without Vertex AI.
In Node.js, set `GEMINI_API_KEY` env var. In browser, pass explicitly.

### How do you pass Anthropic/OpenAI credentials?

**Not built-in.** Options:
1. Use community package `adk-llm-bridge` (uses Vercel AI Gateway)
2. Write your own `BaseLlm` subclass
3. Use a LiteLLM proxy and write a custom adapter
4. Wait for official multi-model support (planned, no timeline)

### What's the minimal code for a single agent with structured output?

See Section 14 above. Key: `outputSchema` (Zod) + `outputKey` (state storage).

### Does it support streaming?

**YES**. Set `runConfig: { streamingMode: StreamingMode.SSE }`.
Partial events have `metadata.partial = true`.
Async generator pattern: `for await (const event of runner.runAsync({...}))`.

### What's the session/state model?

- Session = one conversation with event history + state dict
- State scopes: session (no prefix), user (`user:`), app (`app:`), temp (`temp:`)
- `InMemorySessionService` for no persistence
- State changes committed via events (state_delta in EventActions)
- `outputKey` auto-stores agent response text in state

### Can it run without a server?

**YES**. `InMemoryRunner` creates in-memory services for sessions, artifacts, memory.
No HTTP server, no database, no Google Cloud required.
Works in browser via the `dist/web/index_web.js` entry point.

---

## 16. Risks & Limitations for Word Add-in

### Bundle Size Concern
Dependencies include `@mikro-orm/core`, `@mikro-orm/reflection`, `google-auth-library`,
`@modelcontextprotocol/sdk`, `@a2a-js/sdk`. Many of these are large and unnecessary for
a browser-only add-in. Tree-shaking may help but needs testing.

### Node.js Version Requirement
The CLI tools require Node.js >= 24.13.0. The core library itself may work on older
Node versions or in browser, but this is untested.

### No Native Anthropic/OpenAI Support
If you need Claude or GPT models, you must either:
- Write a custom `BaseLlm` adapter (mapping LlmRequest/LlmResponse)
- Use a community bridge package
- Use a proxy (LiteLLM proxy -> custom adapter)

### Zod v4 Dependency
The package uses `zod ^4.2.1`. If your project uses Zod v3, there may be conflicts.

### `@google/genai` Dependency
The core LlmRequest/LlmResponse types are from `@google/genai`, which uses Gemini-specific
content formats. Non-Google model adapters must translate between formats.

### Young Project
v0.4.0, 855 stars, only 1 TypeScript sample app. API may change.

### Browser `process.env` Access
The Gemini class checks `process.env` -- in browser builds this is guarded by an
`isBrowser()` check, but bundlers may still need polyfills or configuration.

### MCP Tools Not Available in Browser
The Model Context Protocol tools are only in the Node.js entry point, not the browser build.
