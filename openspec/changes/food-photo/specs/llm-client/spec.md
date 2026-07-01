## MODIFIED Requirements

### Requirement: Single-call, no-agent-loop client
The LLM client SHALL wrap the Anthropic SDK as the single seam through which all model calls pass.
Each operation SHALL be **one** request returning a structured result — never an autonomous
tool-call loop (invariant #5). The client SHALL use the model `claude-sonnet-4-6` and read
`ANTHROPIC_API_KEY` from the validated config (env only — invariant #9).

The seam SHALL accept an **optional image** input (base64 data + media type). When one or more images
are supplied, the client SHALL send them as image content block(s) placed **before** the text block
in the single user message, so a vision operation is one more call through the same seam — still
exactly **one** `messages` request with the cached system prefix and no chat history, and still no
tool-call loop. When no image is supplied the request is unchanged (a plain text user message), so
existing text callers are unaffected.

#### Scenario: A classification is one request
- **WHEN** the client performs an intent classification
- **THEN** it issues exactly one `messages` request and returns the parsed structured output, with no
  follow-up tool-result round-trips

#### Scenario: A vision call is one request with the image before the text
- **WHEN** the client performs a structured operation with an image supplied
- **THEN** it issues exactly one `messages` request whose user content is an image content block
  (base64 + media type) followed by the text block, on the cached system prefix, with no follow-up
  round-trips and no agent loop

#### Scenario: Text callers are unaffected by the optional image parameter
- **WHEN** the client is called with no image (router, food estimate, metrics)
- **THEN** the request carries a plain text user message exactly as before — the optional image
  parameter changes nothing for text-only operations
