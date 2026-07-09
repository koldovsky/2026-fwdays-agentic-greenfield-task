// Test-first for the PURE JSON-Schema -> Zod-raw-shape translation and the
// `mcp__intake__*` name prefix/strip helpers (mcp-tool-schema.ts) — no CLI
// spawn, no network, so this suite runs in the unit layer alongside every
// other agent/ test, unlike `claude-agent-smoke.test.ts` (integration,
// gated on real auth).
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  INTAKE_MCP_SERVER_NAME,
  jsonSchemaToZodRawShape,
  mcpToolName,
  stripMcpToolPrefix,
} from "./mcp-tool-schema.ts";
import { TOOLS } from "./tools.ts";

describe("mcpToolName / stripMcpToolPrefix — the mcp__intake__* naming convention", () => {
  it("qualifies a bare tool name with the mcp__intake__ prefix", () => {
    expect(mcpToolName("save_name")).toBe("mcp__intake__save_name");
    expect(INTAKE_MCP_SERVER_NAME).toBe("intake");
  });

  it("strips the prefix back to the original bare name — round-trips every closed-tool-set name", () => {
    for (const tool of TOOLS) {
      expect(stripMcpToolPrefix(mcpToolName(tool.name))).toBe(tool.name);
    }
  });

  it("returns a name unchanged when it does not carry the mcp__intake__ prefix (defensive, never throws)", () => {
    expect(stripMcpToolPrefix("save_name")).toBe("save_name");
    expect(stripMcpToolPrefix("mcp__other-server__save_name")).toBe("mcp__other-server__save_name");
  });
});

describe("jsonSchemaToZodRawShape — translating tools.ts's JSON Schema into a Zod raw shape", () => {
  it("marks every `required` property as a Zod type that REJECTS undefined", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: { name: { type: "string", description: "Name" } },
      required: ["name"],
    });
    expect(shape.name).toBeDefined();
    expect(shape.name!.safeParse(undefined).success).toBe(false);
    expect(shape.name!.safeParse("Оксана").success).toBe(true);
  });

  it("marks a property absent from `required` as optional — accepts undefined", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: { dreamSong: { type: "string", description: "Dream song" } },
      required: [],
    });
    expect(shape.dreamSong!.safeParse(undefined).success).toBe(true);
    expect(shape.dreamSong!.safeParse("Червона рута").success).toBe(true);
  });

  it("maps an `integer` property to a Zod integer type — rejects a non-integer number", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: { age: { type: "integer" } },
      required: ["age"],
    });
    expect(shape.age!.safeParse(7).success).toBe(true);
    expect(shape.age!.safeParse(7.5).success).toBe(false);
    expect(shape.age!.safeParse("7").success).toBe(false);
  });

  it("maps an `enum` property to a Zod enum — accepts only listed values", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: { format: { type: "string", enum: ["individual", "group", "unsure", "instrument"] } },
      required: ["format"],
    });
    expect(shape.format!.safeParse("group").success).toBe(true);
    expect(shape.format!.safeParse("piano").success).toBe(false);
  });

  it("maps a property with NO declared type (amend_field's `value`) to a permissive Zod type", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: { value: { description: "Нове значення поля (тип залежить від поля)." } },
      required: ["value"],
    });
    expect(shape.value!.safeParse(7).success).toBe(true);
    expect(shape.value!.safeParse("group").success).toBe(true);
    expect(shape.value!.safeParse(undefined).success).toBe(true); // z.any() itself never rejects
  });

  it("produces a raw shape (plain object of Zod types), not a ZodObject — `tool()`'s own required input shape", () => {
    const shape = jsonSchemaToZodRawShape(TOOLS[0]!.input_schema);
    expect(shape).not.toBeInstanceOf(z.ZodType);
    expect(typeof shape).toBe("object");
  });

  it("translates every closed-tool-set schema without throwing (tools.ts's real TOOLS list)", () => {
    for (const tool of TOOLS) {
      expect(() => jsonSchemaToZodRawShape(tool.input_schema)).not.toThrow();
    }
  });

  // propose_slots is the one tool with NESTED schema (an array-of-enum and an
  // object) — the shallow converter used to degrade both to `z.any()`, so the
  // production ClaudeAgentModelPort showed the model an untyped parameter and
  // it passed the raw Ukrainian free-text ("середа"/"зранку"), which
  // `validatePreferences` then rejected → propose_slots ALWAYS failed on the
  // real bot. These pin the array/object translation that fixes it.
  it("maps an `array` of enum items to a Zod array — rejects a bare string, accepts a list of listed values", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: {
        weekdays: { type: "array", items: { type: "string", enum: ["Mon", "Tue", "Wed", "Thu", "Fri"] } },
      },
      required: ["weekdays"],
    });
    expect(shape.weekdays!.safeParse(["Wed"]).success).toBe(true);
    expect(shape.weekdays!.safeParse(["Wed", "Fri"]).success).toBe(true);
    expect(shape.weekdays!.safeParse("середа").success).toBe(false); // the raw-text bug
    expect(shape.weekdays!.safeParse(["Sat"]).success).toBe(false); // outside the weekday enum
  });

  it("maps an `object` property to a Zod object — rejects a bare string, requires its declared keys", () => {
    const shape = jsonSchemaToZodRawShape({
      type: "object",
      properties: {
        timeWindow: {
          type: "object",
          properties: { start: { type: "string" }, end: { type: "string" } },
          required: ["start", "end"],
        },
      },
      required: ["timeWindow"],
    });
    expect(shape.timeWindow!.safeParse({ start: "09:00", end: "12:00" }).success).toBe(true);
    expect(shape.timeWindow!.safeParse("зранку").success).toBe(false); // the raw-text bug
    expect(shape.timeWindow!.safeParse({ start: "09:00" }).success).toBe(false); // missing required key
  });
});
