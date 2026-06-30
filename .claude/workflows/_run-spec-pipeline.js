export const meta = {
  name: 'spec-pipeline-run',
  description: 'Baseline OpenSpec specs for the plant tracker (capabilities hardcoded; args harness workaround).',
  phases: [
    { title: 'Author', detail: 'draft + critique + revise per capability' },
    { title: 'Cross-check', detail: 'coverage and consistency over all specs' },
  ],
}

const CRITIQUE_SCHEMA = {
  type: 'object',
  required: ['issues', 'acceptable'],
  properties: {
    acceptable: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

const COVERAGE_SCHEMA = {
  type: 'object',
  required: ['allCovered', 'gaps', 'duplicates', 'contradictions'],
  properties: {
    allCovered: { type: 'boolean' },
    gaps: { type: 'array', items: { type: 'string' } },
    duplicates: { type: 'array', items: { type: 'string' } },
    contradictions: { type: 'array', items: { type: 'string' } },
  },
}

const requirementsPath = 'docs/requirements.md'
const capabilities = [
  {
    name: 'plants',
    frIds: ['FR-PLANT-01', 'FR-PLANT-02', 'FR-PLANT-03', 'FR-PLANT-04', 'FR-PLANT-05', 'FR-PLANT-06', 'FR-PLANT-07', 'FR-PLANT-08'],
    nfrIds: ['NFR-USA-02', 'NFR-DATA-01', 'NFR-DATA-02', 'NFR-PERF-01'],
    notes: "Plant entity is the aggregate root; deleting a plant cascades its own measurements + waterings with a confirm step (FR-PLANT-07). Species defaults to 'money tree / Crassula ovata', editable free text. Single Owner, no auth (NFR-SEC-01). Cross-cutting NFRs (a11y, usability, responsive, localization=Ukrainian UI) travel with every capability — do not claim sole ownership.",
  },
  {
    name: 'growth',
    frIds: ['FR-GROWTH-01', 'FR-GROWTH-02', 'FR-GROWTH-03', 'FR-GROWTH-04', 'FR-GROWTH-05'],
    nfrIds: ['NFR-USA-03', 'NFR-PERF-01'],
    notes: 'Height-in-cm measurement on a date (default today). FR-GROWTH-05 validation is critical: reject non-numeric/negative, ACCEPT decimals including trailing zeros and decimal commas. Dates are date-only in local calendar (Europe/Kiev), no time-of-day (NFR-USA-03). A measurement belongs to one plant.',
  },
  {
    name: 'watering',
    frIds: ['FR-WATER-01', 'FR-WATER-02', 'FR-WATER-03', 'FR-WATER-04', 'FR-WATER-05'],
    nfrIds: ['NFR-USA-03', 'NFR-PERF-01'],
    notes: 'Watering event on a date (default today) + optional free-text note. No water amount in MVP (FR-WATER-06 is Future). Date-only local calendar. A watering belongs to one plant.',
  },
  {
    name: 'charts',
    frIds: ['FR-CHART-01', 'FR-CHART-02', 'FR-CHART-03', 'FR-CHART-04'],
    nfrIds: ['NFR-A11Y-03', 'NFR-PERF-02'],
    notes: 'Watering chart (headline feature) + growth chart on the plant detail view, using Recharts. Per-event points on a daily timeline (no bucketing — Future). Each chart has a clear empty state (FR-CHART-03) and updates on add/edit/delete (FR-CHART-04). NFR-A11Y-03: the underlying values are ALSO available as a list/table (owned by growth + watering), charts are never the only way to read data.',
  },
  {
    name: 'app-shell',
    frIds: ['FR-SHELL-01', 'FR-SHELL-02', 'FR-SHELL-03'],
    nfrIds: ['NFR-A11Y-01', 'NFR-A11Y-02', 'NFR-A11Y-04', 'NFR-USA-01', 'NFR-COMPAT-01', 'NFR-COMPAT-02', 'NFR-LOC-01'],
    notes: 'Single app shell with nav between plant list and plant detail (FR-SHELL-01). Light/dark theme toggle persisted across reloads (FR-SHELL-02). The shared inline form-error pattern (FR-SHELL-03) — surface invalid input inline next to the field, never a raw 500 or silent failure — is DEFINED here and reused by plants/growth/watering. UI copy is Ukrainian (NFR-LOC-01). This capability is the natural home for the cross-cutting a11y/responsive NFRs but every capability must honor them.',
  },
]

phase('Author')
const authored = await pipeline(
  capabilities,
  (cap) =>
    agent(
      `Author the baseline OpenSpec spec for capability "${cap.name}" at openspec/specs/${cap.name}/spec.md.\nRequirements source: ${requirementsPath}. This capability owns these MVP FRs: ${JSON.stringify(cap.frIds)}${cap.nfrIds ? `; travelling NFRs: ${JSON.stringify(cap.nfrIds)}` : ''}. ${cap.notes ?? ''}\n\nEXACT OpenSpec 1.5 baseline-spec format (validated by \`npx openspec validate --all --strict\` — this CLI is installed):\n\`\`\`\n# ${cap.name} capability\n\n## Purpose\n<2-3 sentences, MUST be >= 50 characters, describing what this capability is for>\n\n## Requirements\n\n### Requirement: <short imperative name>\nThe system SHALL <behavior> (cite the owned FR id(s) in the text, e.g. FR-...).\n\n#### Scenario: <name>\n- **WHEN** <condition>\n- **THEN** <objectively checkable outcome>\n\n#### Scenario: <error/edge name>\n- **WHEN** <invalid/edge condition>\n- **THEN** <how it is surfaced — inline error, never a raw 500 or silent failure>\n\`\`\`\nRULES: every owned FR maps to at least one ### Requirement and is cited by id in that requirement's text. Each Requirement has >= 1 Scenario; include error-path scenarios (invalid input, oversized/locale-formatted numbers where relevant per FR-GROWTH-05, empty states). State explicit exclusions (what is Future) in the Purpose or a short note. Do NOT use "## ADDED Requirements" (that is change-delta format, not baseline). Do NOT invent scope beyond the owned FRs. After writing, run \`npx openspec validate --all --strict\` and fix any ERRORS (a too-brief-Purpose WARNING is acceptable but prefer to satisfy it). Return the list of requirement names you authored.`,
      { label: `draft:${cap.name}`, phase: 'Author', agentType: 'project-factory:spec-writer' },
    ),
  (draftResult, cap) =>
    agent(
      `Critique the spec at openspec/specs/${cap.name}/spec.md against ${requirementsPath} (owned FRs: ${JSON.stringify(cap.frIds)}).\nCheck: every owned FR covered; every scenario objectively pass/fail decidable; error paths present (invalid input, unauthorized, oversized/locale-formatted values); explicit exclusions stated; no scope invented beyond the FRs. Return acceptable=true only if you found nothing material.`,
      { label: `critique:${cap.name}`, phase: 'Author', schema: CRITIQUE_SCHEMA },
    ),
  async (critique, cap) => {
    if (critique && !critique.acceptable && critique.issues.length > 0) {
      await agent(
        `Revise openspec/specs/${cap.name}/spec.md to resolve these critique issues, then run \`npx openspec validate --all --strict\` and fix any validation errors:\n${critique.issues.map((i, n) => `${n + 1}. ${i}`).join('\n')}`,
        { label: `revise:${cap.name}`, phase: 'Author', agentType: 'project-factory:spec-writer' },
      )
      return { capability: cap.name, revised: true, issuesFixed: critique.issues.length }
    }
    return { capability: cap.name, revised: false, issuesFixed: 0 }
  },
)

phase('Cross-check')
const coverage = await agent(
  `Cross-check ALL baseline specs under openspec/specs/ against ${requirementsPath}.\nCapability ownership map: ${JSON.stringify(capabilities.map((c) => ({ name: c.name, frIds: c.frIds })))}.\nVerify: (1) every MVP FR appears in exactly one spec - list gaps and duplicates by FR id; (2) no two specs contradict each other (shared entities, statuses, role names); (3) cross-cutting NFRs are not silently owned by one spec. Read the actual spec files.`,
  { label: 'coverage-check', phase: 'Cross-check', schema: COVERAGE_SCHEMA },
)

log(
  coverage?.allCovered
    ? 'Coverage check passed: all MVP FRs owned exactly once.'
    : `Coverage problems - gaps: ${coverage?.gaps?.length ?? '?'}, duplicates: ${coverage?.duplicates?.length ?? '?'}, contradictions: ${coverage?.contradictions?.length ?? '?'}`,
)

return { authored: authored.filter(Boolean), coverage }
