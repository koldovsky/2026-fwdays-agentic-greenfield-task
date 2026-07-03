## ADDED Requirements

### Requirement: Provider port with emulator adapter
The system SHALL access payments only through a provider port
(`createCheckout`, `handleWebhook`, `getSubscription`, `cancel`) and SHALL ship a
built-in emulator adapter implementing it for development and demos. The active
adapter SHALL be selected by configuration, and the emulator SHALL NOT be used in
production. Subscription state SHALL be updated only by the webhook handler, in
both emulated and real modes. Implements TC-STACK-06.

#### Scenario: Emulator selected in dev
- **WHEN** the payments provider config is `emulator`
- **THEN** checkout and billing use the emulator adapter and no external payment provider is contacted

#### Scenario: Webhook is the only writer
- **WHEN** an emulated checkout is completed
- **THEN** the `subscriptions` record is updated by the webhook handler, not by the checkout screen directly

### Requirement: Paywall intercepts export and second tailoring
The system SHALL present a paywall at the export step and at the start of any
tailoring beyond the first free one, offering the Pro subscription and the
Job-hunt Pass; the user chooses a plan before entering checkout. Free-tier limits
SHALL be enforced via usage counters. Implements FR-PAYWALL-01, FR-PAYWALL-02,
NFR-COST-02.

#### Scenario: Paywall at export
- **WHEN** a free or anonymous user attempts to export or start a second tailoring
- **THEN** the paywall appears offering Pro and Job-hunt Pass, and the action is blocked until a plan is chosen

### Requirement: Successful payment upgrades immediately
The system SHALL, on a successful (emulated) payment, upgrade the session
immediately and return the user to exactly the screen they left. Implements
FR-PAYWALL-03.

#### Scenario: Return to prior screen upgraded
- **WHEN** the user completes an emulated successful checkout from the export paywall
- **THEN** their plan is upgraded and they are returned to the export screen with export now unlocked

### Requirement: Billing portal
The system SHALL provide a billing portal showing the current plan, next renewal
date, invoice history, and a cancel button. Cancellation SHALL downgrade to Free
at the end of the current period, leaving existing tailorings readable but export
gated. Implements FR-BILLING-01, FR-BILLING-02.

#### Scenario: View plan and cancel
- **WHEN** a Pro user opens the billing portal and cancels
- **THEN** the portal shows plan, renewal date, and invoices, and cancellation schedules a downgrade to Free at period end

#### Scenario: Downgraded access
- **WHEN** a cancelled subscription reaches period end
- **THEN** the user is on Free; past tailorings remain readable but export is gated

### Requirement: Payment failure returns to Free cleanly
The system SHALL, on an (emulated) payment failure at checkout, return the user to
Free status with a clear message and a retry CTA, and SHALL NOT grant any
partial-access state. Implements FR-BILLING-03.

#### Scenario: Failed checkout grants nothing
- **WHEN** an emulated checkout fails
- **THEN** the user remains on Free, sees a clear message with a retry CTA, and receives no partial entitlement
