# marketing-landing (delta)

## MODIFIED Requirements

### Requirement: Landing represents the full export flow
The landing page SHALL represent the tailoring inputs and outputs that ship
today: the original-PDF attachment (a paid input to the generation pass), the
grounded resume export, the grounded cover-letter export, and saved tailoring
history for signed-in paid users. The how-it-works section SHALL name the
cover-letter export and history as flow outputs; the pricing table SHALL list the
original-PDF attachment among the Pro capabilities; and the FAQ SHALL answer at
least one question about cover letters and/or saved history and at least one about
the original-PDF attachment. Anything represented SHALL be a shipped capability;
the page SHALL NOT advertise capabilities that are not yet built. Implements
FR-SALES-01, FR-COVERLETTER-01, FR-HISTORY-01, FR-PAYWALL-02.

#### Scenario: Cover letter and history are represented
- **WHEN** an anonymous visitor reads the how-it-works and FAQ sections
- **THEN** the cover-letter export and saved history are described as available outputs of the flow

#### Scenario: Premium original-PDF attachment is represented honestly
- **WHEN** an anonymous visitor reads the pricing table and FAQ
- **THEN** the original-PDF attachment is listed as a Pro capability
- **AND** the FAQ explains it enriches the generation pass with the full document while never entering the grounding pass and never introducing experience the CV does not support (BC-HONESTY-01)
- **AND** no unbuilt capability is advertised
