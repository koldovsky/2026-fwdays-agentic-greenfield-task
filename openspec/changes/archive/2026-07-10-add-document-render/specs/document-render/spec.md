## ADDED Requirements

### Requirement: FR-TPL-02 Fixed document sections
The rendered document SHALL preserve the template's fixed sections. The invoice title, the subtitle, and the TERMS AND CONDITIONS block contain no placeholders and SHALL appear byte-identical to `docs/invoice-template.html`. The signature block SHALL keep its markup and caption unchanged; only the `{{SIGNATORY_EN}}` and `{{SIGNATORY_UA}}` placeholders inside it are substituted (FR-TPL-01). No substitution SHALL alter any other markup or text of these sections.

#### Scenario: Placeholder-free sections survive rendering
- **WHEN** an invoice is rendered with any variable values
- **THEN** the title, the subtitle, and the TERMS block in the output are byte-identical to `docs/invoice-template.html`

#### Scenario: Signature block keeps its fixed markup
- **WHEN** an invoice is rendered
- **THEN** the signature block's markup and caption are unchanged and only the signatory names are substituted

### Requirement: FR-TPL-04 Optional project block
The system SHALL render `{{PROJECT_BLOCK}}` as a labelled block when a project name is supplied, and as an empty string when it is absent.

#### Scenario: Project supplied
- **WHEN** the invoice carries a project name
- **THEN** the customer section contains the project block with the escaped project name

#### Scenario: No project supplied
- **WHEN** the invoice carries no project name
- **THEN** `{{PROJECT_BLOCK}}` is replaced with an empty string and no empty markup wrapper remains

### Requirement: NFR-PERF-02 Render latency
Rendering a single invoice SHALL complete in under 200 ms on a developer machine.

#### Scenario: Single invoice render
- **WHEN** one invoice with a typical line-item count is rendered
- **THEN** the render completes in under 200 ms

## MODIFIED Requirements

### Requirement: FR-TPL-01 Template placeholder fill
The system SHALL render invoices from `docs/invoice-template.html` by replacing `{{VARIABLE_NAME}}` placeholders with computed values. All substituted text values SHALL be HTML-escaped by the fill step; only markup fragments produced by this capability's own builders (`{{SERVICE_ROWS}}`, `{{PROJECT_BLOCK}}`) SHALL be inserted as raw HTML, and those builders SHALL escape every value they interpolate. Rendering SHALL fail closed: a missing value for a placeholder present in the template, or a supplied variable with no matching placeholder, SHALL raise a typed error naming the variable instead of emitting a document.

#### Scenario: Variable substitution
- **WHEN** all required placeholders have values
- **THEN** the output HTML contains no unreplaced `{{...}}` tokens for required fields

#### Scenario: Hostile text value
- **WHEN** a variable value contains HTML metacharacters such as `<script>alert(1)</script>`
- **THEN** the output renders them as inert escaped text and never as markup

#### Scenario: Missing value
- **WHEN** a placeholder present in the template has no supplied value
- **THEN** rendering raises a typed error naming that placeholder and produces no output

### Requirement: FR-TPL-03 Service rows expansion
The system SHALL expand `{{SERVICE_ROWS}}` into table rows with bilingual description, quantity, unit price, and line amount. Monetary columns SHALL be formatted with thousands separators and two decimals (`1,234.56`), and every interpolated value SHALL be HTML-escaped.

#### Scenario: Single service row
- **WHEN** one service line is provided
- **THEN** the service table contains one row with bilingual text and numeric columns

#### Scenario: Multiple service rows
- **WHEN** several service lines are provided
- **THEN** the table contains one row per line, in the supplied order, each showing quantity, unit price, and the line amount as unit price × quantity
