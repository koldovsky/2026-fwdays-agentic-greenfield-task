// The fake adapter must honor the same port contract as the emulator, so
// upper-layer tests built on it stay truthful (task 1.1 contract test).
import { createFakePaymentsProvider } from "./fake-provider";
import { describePaymentsProviderContract } from "./contract";

describePaymentsProviderContract("fake provider", () => createFakePaymentsProvider());
