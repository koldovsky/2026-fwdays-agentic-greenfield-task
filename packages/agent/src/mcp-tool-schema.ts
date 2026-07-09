// @kamerton/agent — pure JSON-Schema -> Zod-raw-shape translation, plus the
// MCP fully-qualified tool-name convention, both factored out of
// `claude-agent-model-port.ts` so they are unit-testable WITHOUT spawning the
// `claude` CLI (`claude-agent-model-port.test.ts` covers them).
//
// WHY THIS EXISTS: `tools.ts`'s closed `ToolDefinition[]` list is JSON
// Schema (`input_schema: { type: "object", properties, required }`) — the
// same shape `AnthropicModelPort` forwards to the raw Anthropic Messages API
// verbatim. The Claude Agent SDK's own `tool()` helper (bundled
// `sdk.d.ts`, `@anthropic-ai/claude-agent-sdk@0.3.201`) does NOT accept that
// shape: its signature is
//   `tool<Schema extends AnyZodRawShape>(name, description, inputSchema:
//   Schema, handler): SdkMcpToolDefinition<Schema>`
// where `AnyZodRawShape = ZodRawShape | ZodRawShape_2` (zod v3/v4's own
// `Record<string, ZodTypeAny>` raw-shape type, NOT a `ZodObject` and NOT raw
// JSON Schema) — confirmed by reading the bundled `sdk.d.ts` (imports
// `ZodRawShape` from `"zod"` and from `"zod/v4"`) rather than assumed from
// memory, per this repo's "verify against the installed package" rule.
// `zod@4.4.3` is already an installed dependency of the SDK; this module
// imports the same top-level `"zod"` the SDK's own type import resolves to.
//
// This translation covers every JSON-Schema construct `tools.ts` actually
// emits: `string`/`integer`/`number`/`boolean`, `enum`, ARRAY (of enum/scalar
// items) and nested OBJECT (`propose_slots`'s `weekdays`/`timeWindow`), plus
// one untyped free-value property (`amend_field`'s `value` — "тип залежить від
// поля", read by the reducer, not the schema). Arrays and objects are
// translated RECURSIVELY. This is not merely cosmetic typing: the model only
// ever sees the schema this produces, so degrading `weekdays`/`timeWindow` to
// `z.any()` (as the earlier shallow version did) made the production
// ClaudeAgentModelPort offer the model an untyped parameter — it then passed
// the raw Ukrainian free-text and `validatePreferences` rejected every
// `propose_slots` call. Defense in depth still lives at `transition()`/
// `validatePreferences` (design.md Decision 1); faithful schema typing is
// what lets a well-formed call reach them in the first place.
import { z } from "zod";
import type { ZodTypeAny } from "zod";
import type { ToolDefinition } from "./model-port.ts";

/** The shape `tool()` (the Claude Agent SDK) wants as its third argument —
 *  `Record<string, ZodTypeAny>`, structurally the same thing zod's own
 *  `ZodRawShape`/`AnyZodRawShape` compat aliases describe. Built and typed
 *  as a plain mutable `Record` here rather than importing zod's own
 *  `ZodRawShape` type directly: that compat alias resolves to
 *  `Readonly<{ [k: string]: $ZodType }>` (zod v4's CORE `$ZodType`, which
 *  lacks `safeParse`/etc. — those live on the classic `ZodType` mixin this
 *  module's own `ZodTypeAny` values actually are), which both forbids the
 *  index-signature writes this builder does and erases the classic API this
 *  file's own tests exercise (`.safeParse`). A `Record<string, ZodTypeAny>`
 *  is exactly what `AnyZodRawShape` needs structurally at the `tool()` call
 *  site in `claude-agent-model-port.ts`. */
export type ToolInputShape = Record<string, ZodTypeAny>;

/** The in-process MCP server name every closed-tool-set tool is registered
 *  under (`claude-agent-model-port.ts`'s `createSdkMcpServer({ name: ... })`
 *  call) — a single source of truth so the qualify/strip helpers below and
 *  the server registration itself can never drift apart. */
export const INTAKE_MCP_SERVER_NAME = "intake";

/** The Claude Agent SDK's own fully-qualified MCP tool-name convention,
 *  `mcp__<server>__<tool>` (confirmed in `sdk.d.ts`'s
 *  `SDKControlMcpCallRequest.tool` doc comment: "Fully-qualified MCP tool
 *  name, e.g. mcp__server__tool_name."). `allowedTools` and `canUseTool`'s
 *  `toolName` both use this qualified form; `tools.ts`'s own `ToolDefinition`
 *  list and `loop.ts`'s dispatch use the bare name — this pair of helpers is
 *  the ONLY place that prefix is added or removed. */
export function mcpToolName(bareName: string): string {
  return `mcp__${INTAKE_MCP_SERVER_NAME}__${bareName}`;
}

/** Inverse of `mcpToolName` — strips the `mcp__intake__` prefix back to the
 *  bare tool name `loop.ts`'s `toIntakeEvent`/`applyToolUse` dispatch on a
 *  `ToolUseBlock.name` expects (same bare names `tools.ts`'s `TOOL_NAMES`
 *  lists — `save_name`, `cancel_request`, etc.). A name that does not carry
 *  this exact prefix is returned unchanged rather than throwing: defensive
 *  only, since every tool this adapter registers is always qualified this
 *  way by construction; this just avoids inventing a crash for an input the
 *  SDK itself is not expected to ever produce. */
export function stripMcpToolPrefix(qualifiedName: string): string {
  const prefix = `mcp__${INTAKE_MCP_SERVER_NAME}__`;
  return qualifiedName.startsWith(prefix) ? qualifiedName.slice(prefix.length) : qualifiedName;
}

/** The minimal JSON-Schema property shape `tools.ts` actually emits — read
 *  defensively (never assumed) since `ToolDefinition.input_schema.properties`
 *  is typed as `Record<string, unknown>` upstream. */
interface JsonSchemaPropertyShape {
  type?: unknown;
  enum?: unknown;
  description?: unknown;
  /** `type: "array"` — the element schema (recursively translated). */
  items?: unknown;
  /** `type: "object"` — the nested property schemas + their required set. */
  properties?: unknown;
  required?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyStringArray(value: unknown): value is [string, ...string[]] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string");
}

/** Translates one JSON-Schema property (as `tools.ts` shapes it) into the
 *  matching Zod type, then applies `.optional()` when the property is not in
 *  the schema's `required` list (JSON Schema's own optionality signal —
 *  `zod`'s raw-shape convention marks optional fields the same way `tool()`
 *  itself expects, `AnyZodRawShape`'s `InferShape` derives strictness from
 *  each entry's own `.optional()`, not from a separate required-set). */
function jsonSchemaPropertyToZod(rawProperty: unknown, isRequired: boolean): ZodTypeAny {
  const property: JsonSchemaPropertyShape = isPlainObject(rawProperty) ? rawProperty : {};

  let base: ZodTypeAny;
  if (isNonEmptyStringArray(property.enum)) {
    // `save_format`'s CANDIDATE_FORMATS / `save_goal`'s GOAL_TAGS /
    // `amend_field`'s field-name enum — the schema-level guardrail
    // (`@trace FR-GUARD-01`) this repo's tools.ts header names as the FIRST
    // of the two checks a schema-enum parameter gets (the second being the
    // `lib/` validator behind it).
    base = z.enum(property.enum);
  } else if (property.type === "integer") {
    base = z.number().int();
  } else if (property.type === "number") {
    base = z.number();
  } else if (property.type === "boolean") {
    base = z.boolean();
  } else if (property.type === "string") {
    base = z.string();
  } else if (property.type === "array") {
    // `propose_slots`'s `weekdays` (array of the Mon-Fri enum). The element
    // schema is translated by the SAME function (recursively) — an item is
    // always "present" within the array, so `isRequired: true`. Missing
    // `items` degrades to `z.any()` elements rather than throwing (defensive;
    // tools.ts always supplies `items`). WITHOUT this branch the whole array
    // fell through to `z.any()`, so the model saw an untyped parameter and
    // passed raw free-text ("середа") that `validatePreferences` rejected.
    const element = jsonSchemaPropertyToZod(property.items, true);
    base = z.array(element);
  } else if (property.type === "object") {
    // `propose_slots`'s `timeWindow` ({start, end}). Nested properties are
    // translated recursively, each optional/required per this object's OWN
    // `required` list (JSON Schema's per-level optionality). Same rationale
    // as the array branch: without it, the object degraded to `z.any()`.
    const nestedProperties = isPlainObject(property.properties) ? property.properties : {};
    const nestedRequired = new Set(
      Array.isArray(property.required) ? property.required.filter((n): n is string => typeof n === "string") : [],
    );
    const shape: ToolInputShape = {};
    for (const [key, value] of Object.entries(nestedProperties)) {
      shape[key] = jsonSchemaPropertyToZod(value, nestedRequired.has(key));
    }
    base = z.object(shape);
  } else {
    // No declared `type` at all — exactly `amend_field`'s `value` property
    // (`tools.ts`: "тип залежить від поля"). The reducer (`transition()`,
    // design.md Decision 1) is the real validation gate for this one field;
    // this schema only needs to admit a syntactically valid call.
    base = z.any();
  }

  if (typeof property.description === "string") {
    base = base.describe(property.description);
  }

  return isRequired ? base : base.optional();
}

/** Translates one `ToolDefinition.input_schema` (JSON Schema, `tools.ts`'s
 *  own shape) into the `ZodRawShape` (`Record<string, ZodTypeAny>`) the SDK's
 *  `tool()` requires as its third argument — the pure conversion this
 *  module exists for, exported so `claude-agent-model-port.ts` never
 *  duplicates it and `mcp-tool-schema.test.ts` can assert it without
 *  spawning the CLI. */
export function jsonSchemaToZodRawShape(inputSchema: ToolDefinition["input_schema"]): ToolInputShape {
  const required = new Set(inputSchema.required ?? []);
  const shape: ToolInputShape = {};
  for (const [propertyName, rawProperty] of Object.entries(inputSchema.properties)) {
    shape[propertyName] = jsonSchemaPropertyToZod(rawProperty, required.has(propertyName));
  }
  return shape;
}
