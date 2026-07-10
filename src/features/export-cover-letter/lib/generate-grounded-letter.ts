// Two-pass grounded cover-letter generation (improve-tailoring-quality T5 §3.1-3.3).
// Mirrors the bullet honesty model: pass 1 GENERATES from the rich context
// (requirements steer emphasis, careerStage calibrates tone); pass 2 VERIFIES
// the finished prose against ONLY the CV sentences + confirmed answers in a
// separate, isolated prompt (no requirements/JD/careerStage). The letter is
// returned only when every factual claim is supported; any generation, parse, or
// verification failure returns null so the caller falls back to the deterministic
// reflow letter — unverified prose can never reach the export (BC-HONESTY-01/02,
// NFR-OBS-01). Pure over the injected provider; the provider is the only IO.
import {
  buildCoverLetterPrompt,
  buildCoverLetterVerificationPrompt,
  parseCoverLetterResponse,
  parseCoverLetterVerdict,
  type CoverLetterInput,
  type CoverLetterOutput,
  type LlmProvider,
} from "@/shared/lib/llm";

export interface GenerateGroundedLetterDeps {
  readonly llm: LlmProvider;
}

// Letters are short; the verification pass runs at high effort to match the
// bullet grounding pass (honesty over latency).
const GENERATION_MAX_TOKENS = 1024;
const VERIFICATION_MAX_TOKENS = 1024;

/**
 * Generate a grounded cover letter, or null when it cannot be produced honestly.
 * Null is the fail-honest signal: the caller ships the deterministic reflow
 * letter instead. Never throws — provider refusals/timeouts resolve to null.
 */
export async function generateGroundedCoverLetter(
  input: CoverLetterInput,
  deps: GenerateGroundedLetterDeps,
): Promise<CoverLetterOutput | null> {
  try {
    const generatedRaw = await deps.llm.complete(buildCoverLetterPrompt(input), {
      maxTokens: GENERATION_MAX_TOKENS,
    });
    const generated = parseCoverLetterResponse(generatedRaw);
    if (!generated.ok) return null;

    // Pass 2: verify against CV sentences + confirmed answers ONLY. The
    // requirements, JD, and career stage are deliberately not forwarded, so the
    // verifier cannot rationalize a claim from anything but the candidate's own
    // evidence (isolation mirrors buildGroundingPrompt).
    const verificationRaw = await deps.llm.complete(
      buildCoverLetterVerificationPrompt({
        paragraphs: generated.value.paragraphs,
        cvSentences: input.cvSentences,
        confirmedAnswers: input.confirmedAnswers,
      }),
      { maxTokens: VERIFICATION_MAX_TOKENS, effort: "high" },
    );
    const verdict = parseCoverLetterVerdict(verificationRaw);
    if (!verdict.ok) return null;
    if (!verdict.value.supported || verdict.value.unsupportedClaims.length > 0) {
      return null;
    }

    return generated.value;
  } catch {
    return null;
  }
}
