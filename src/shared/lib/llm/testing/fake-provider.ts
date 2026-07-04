// A scriptable, in-memory LlmProvider double for tests and local/dev runs
// (add-agent-loop). No SDK, no network, no key — so the whole tailoring loop is
// exercisable without ANTHROPIC_API_KEY. Framework-free (TC-PURE-01): imports
// only the port + prompt constants from this slice's public API.
//
// It classifies each call by its system prompt (the loop sends exactly one of
// the three pass prompts) and returns the scripted raw text for that pass, so
// the real tolerant parsers (parse.ts) run unchanged. Every call is recorded so
// a test can prove what the loop did — e.g. that the grounding pass never saw
// the JD (BC-HONESTY-01 / FR-BULLETS-03) and that no user id reached a payload
// (NFR-SEC-02).
import {
  EXTRACTION_SYSTEM_PROMPT,
  GENERATION_SYSTEM_PROMPT,
  GROUNDING_SYSTEM_PROMPT,
  SENIORITY_SYSTEM_PROMPT,
  type CareerStage,
  type GroundingLabel,
  type LlmCallOptions,
  type LlmProvider,
  type Prompt,
  type Requirement,
} from "..";

/** Which pass a given call carries. `seniority` is the §3 analysis-phase step. */
export type FakePhase =
  | "extraction"
  | "seniority"
  | "generation"
  | "grounding"
  | "unknown";

/** One recorded provider call — the classified phase plus the raw prompt. */
export interface FakeCall {
  readonly phase: FakePhase;
  readonly prompt: Prompt;
  /** All message contents joined — the surface a leak scan inspects. */
  readonly payload: string;
}

/** A canned response for a phase: a fixed string, or a function of the call. */
export type FakeResponder = string | ((call: FakeCall) => string);

export interface FakeProviderScript {
  readonly extraction?: FakeResponder;
  /** §3 seniority inference — auxiliary/best-effort; unscripted calls throw. */
  readonly seniority?: FakeResponder;
  readonly generation?: FakeResponder;
  readonly grounding?: FakeResponder;
  /** Phases that should throw instead of responding (fail-honest tests). */
  readonly throwOn?: readonly FakePhase[];
}

export interface FakeProvider extends LlmProvider {
  /** Every call the subject made, in order (including calls that threw). */
  readonly calls: readonly FakeCall[];
}

/** Serialize a prompt to the text a leak scan sees (all roles' content). */
function payloadOf(prompt: Prompt): string {
  return prompt.messages.map((m) => m.content).join("\n");
}

/** Classify a prompt by its system message — the loop sends one pass at a time. */
export function classifyPrompt(prompt: Prompt): FakePhase {
  const system = prompt.messages.find((m) => m.role === "system")?.content ?? "";
  if (system === EXTRACTION_SYSTEM_PROMPT) return "extraction";
  if (system === SENIORITY_SYSTEM_PROMPT) return "seniority";
  if (system === GENERATION_SYSTEM_PROMPT) return "generation";
  if (system === GROUNDING_SYSTEM_PROMPT) return "grounding";
  return "unknown";
}

function resolve(
  responder: FakeResponder | undefined,
  call: FakeCall,
): string | undefined {
  if (responder === undefined) return undefined;
  return typeof responder === "function" ? responder(call) : responder;
}

/**
 * Build a fake {@link LlmProvider} that answers each pass from `script`. A phase
 * with no scripted response (and not in `throwOn`) throws a clear error, so a
 * test can never silently pass on an unscripted call.
 */
export function createFakeProvider(script: FakeProviderScript = {}): FakeProvider {
  const calls: FakeCall[] = [];
  const throwOn = new Set(script.throwOn ?? []);

  function respond(prompt: Prompt): string {
    const phase = classifyPrompt(prompt);
    const call: FakeCall = { phase, prompt, payload: payloadOf(prompt) };
    calls.push(call);

    if (throwOn.has(phase)) {
      throw new Error(`fake_throw:${phase}`);
    }
    const responder =
      phase === "extraction"
        ? script.extraction
        : phase === "seniority"
          ? script.seniority
          : phase === "generation"
            ? script.generation
            : phase === "grounding"
              ? script.grounding
              : undefined;
    const text = resolve(responder, call);
    if (text === undefined) {
      throw new Error(`fake: no response scripted for phase "${phase}"`);
    }
    return text;
  }

  return {
    calls,
    async complete(prompt: Prompt, _options?: LlmCallOptions): Promise<string> {
      void _options;
      return respond(prompt);
    },
    async *stream(prompt: Prompt, _options?: LlmCallOptions): AsyncIterable<string> {
      void _options;
      const text = respond(prompt);
      // Emit in two chunks so streaming consumers exercise chunk-joining.
      const mid = Math.floor(text.length / 2);
      yield text.slice(0, mid);
      yield text.slice(mid);
    },
  };
}

// --- Response builders (parser-valid JSON) --------------------------------
// Small helpers so tests (and a future `?fake=1` dev route) script responses
// declaratively. Each returns the exact JSON shape the matching parser accepts.

/** Build an extraction response: `{"requirements":[...]}` (parse.ts). */
export function fakeExtraction(requirements: readonly Requirement[]): string {
  return JSON.stringify({ requirements });
}

/** Build a seniority response: `{"stage":"...","rationale":"..."}` (parse.ts). */
export function fakeSeniority(stage: CareerStage, rationale = "На основі досвіду в резюме."): string {
  return JSON.stringify({ stage, rationale });
}

/** Build a generation response: `{"bullets":[{id,text,sourceSentence?}]}`. */
export function fakeGeneration(
  bullets: readonly { id: string; text: string; sourceSentence?: string }[],
): string {
  return JSON.stringify({ bullets });
}

/** Build a grounding response: `{"verdicts":[{bulletId,label,evidence?,evidenceKind?}]}`. */
export function fakeGrounding(
  verdicts: readonly {
    bulletId: string;
    label: GroundingLabel;
    evidence?: string;
    /** Which evidence lane backed the verdict (BC-HONESTY-03); omit for "cv". */
    evidenceKind?: "cv" | "user-confirmed";
  }[],
): string {
  return JSON.stringify({ verdicts });
}
