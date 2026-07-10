# paywall (delta)

## MODIFIED Requirements

### Requirement: Paywall opens from the Premium attach zone banner
The paywall upgrade surface SHALL open when the upgrade CTA inside
`PremiumAttachZone` is activated, using the `attach` reason (already introduced
in `add-premium-pdf-attach`). No new `PaywallReason` value is needed if `attach`
already exists in the system; if it does not, it SHALL be added. The paywall
SHALL display the `attachLead` copy already present in `shared/lib/i18n` for the
`paywall` section (ua + en). Implements FR-PAYWALL-01, FR-PAYWALL-02.

#### Scenario: Premium banner CTA triggers the paywall with attach reason
- **WHEN** a non-paid user activates the upgrade CTA in the `PremiumAttachZone`
  banner
- **THEN** the paywall opens with reason `"attach"`
- **AND** the paywall renders the `attachLead` copy (already in the dictionary)
  as the lead sentence

#### Scenario: Paywall dismiss leaves the blurred zone intact
- **WHEN** a non-paid user opens the paywall from the Premium banner and then
  dismisses it without upgrading
- **THEN** the paywall closes and `PremiumAttachZone` remains blurred and disabled
- **AND** the `TextUploadZone` is unaffected and still accepts uploads

#### Scenario: Paywall is keyboard-accessible from the banner CTA
- **WHEN** the Premium banner CTA is focused via keyboard and activated
- **THEN** the paywall opens and the first interactive element inside it
  receives focus (NFR-A11Y-01)
- **AND** dismissing the paywall returns focus to the upgrade CTA
