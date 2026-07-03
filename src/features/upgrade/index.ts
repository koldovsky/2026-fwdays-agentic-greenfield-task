// Public API for the upgrade feature (add-payments-emulator task 2.1,
// FR-PAYWALL-02/03) — other layers import ONLY this barrel.
export { UpgradePlans, type UpgradePlansProps } from "./ui/UpgradePlans";
export { startCheckout, type StartCheckoutResult } from "./api/start-checkout";
