// Local Expo module: native (Apple) side only. Autolinking picks it up via
// `expo-module.config.json`; the app talks to it through a typed, no-op-safe wrapper at
// `apps/mobile/src/native/liveActivity.ts` (which calls `requireOptionalNativeModule`),
// so there is intentionally no JS API exported from here.
export {};
