// Tests for the fake LlmProvider double. It must (a) satisfy the port, (b)
// classify each pass by system prompt, (c) stream and complete agree, (d) throw
// on demand for fail-honest tests, and (e) record every call for leak scans.
import { describe, expect, it } from "vitest";

import {
  buildExtractionPrompt,
  buildGenerationPrompt,
  buildGroundingPrompt,
  buildSeniorityPrompt,
  type Prompt,
} from "..";
import {
  classifyPrompt,
  createFakeProvider,
  fakeExtraction,
  fakeGeneration,
  fakeGrounding,
  fakeSeniority,
} from "./fake-provider";

const extractionPrompt = buildExtractionPrompt({ jobDescription: "React role" });
const seniorityPrompt = buildSeniorityPrompt({ cvText: "6 років на React" });
const generationPrompt = buildGenerationPrompt({
  cvProfile: { skills: ["react"], sentences: ["Built a React app."] },
  requirements: [{ id: "r1", text: "React", importance: "must-have", keywords: ["react"] }],
  jobDescription: "React role",
});
const groundingPrompt = buildGroundingPrompt({
  bullets: [{ id: "b1", text: "Побудував застосунок на React." }],
  cvSentences: ["Built a React app."],
});

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let out = "";
  for await (const chunk of stream) out += chunk;
  return out;
}

describe("classifyPrompt", () => {
  it("classifies each pass by its system prompt", () => {
    expect(classifyPrompt(extractionPrompt)).toBe("extraction");
    expect(classifyPrompt(seniorityPrompt)).toBe("seniority");
    expect(classifyPrompt(generationPrompt)).toBe("generation");
    expect(classifyPrompt(groundingPrompt)).toBe("grounding");
  });

  it("returns 'unknown' for an unrecognized system prompt", () => {
    const foreign: Prompt = { messages: [{ role: "system", content: "hello" }] };
    expect(classifyPrompt(foreign)).toBe("unknown");
  });
});

describe("createFakeProvider", () => {
  it("returns the scripted response for each phase and records the calls", async () => {
    const provider = createFakeProvider({
      extraction: fakeExtraction([
        { id: "r1", text: "React", importance: "must-have", keywords: ["react"] },
      ]),
      generation: fakeGeneration([{ id: "b1", text: "…", sourceSentence: "Built a React app." }]),
      grounding: fakeGrounding([{ bulletId: "b1", label: "grounded", evidence: "Built a React app." }]),
    });

    const extraction = await provider.complete(extractionPrompt);
    expect(JSON.parse(extraction)).toHaveProperty("requirements");

    await provider.complete(generationPrompt);
    await provider.complete(groundingPrompt);

    expect(provider.calls.map((c) => c.phase)).toEqual([
      "extraction",
      "generation",
      "grounding",
    ]);
    // The payload carries the message content for leak scans.
    expect(provider.calls[0].payload).toContain("React role");
  });

  it("classifies and answers the §3 seniority pass", async () => {
    const provider = createFakeProvider({ seniority: fakeSeniority("mid", "кілька проєктів") });
    const raw = await provider.complete(seniorityPrompt);
    expect(JSON.parse(raw)).toEqual({ stage: "mid", rationale: "кілька проєктів" });
    expect(provider.calls.map((c) => c.phase)).toEqual(["seniority"]);
  });

  it("stream and complete return the same text (chunked)", async () => {
    const script = { extraction: fakeExtraction([
      { id: "r1", text: "React", importance: "must-have" as const, keywords: ["react"] },
    ]) };

    const completed = await createFakeProvider(script).complete(extractionPrompt);
    const streamed = await collect(createFakeProvider(script).stream(extractionPrompt));
    expect(streamed).toBe(completed);
  });

  it("throws for a phase listed in throwOn (fail-honest driver)", async () => {
    const provider = createFakeProvider({ throwOn: ["extraction"] });
    await expect(provider.complete(extractionPrompt)).rejects.toThrow("fake_throw:extraction");
    // The failed call is still recorded.
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].phase).toBe("extraction");
  });

  it("throws a clear error when a needed phase is not scripted", async () => {
    const provider = createFakeProvider({});
    await expect(provider.complete(extractionPrompt)).rejects.toThrow(
      'fake: no response scripted for phase "extraction"',
    );
  });
});
