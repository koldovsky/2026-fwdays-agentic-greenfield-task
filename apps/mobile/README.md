# @honeydo/mobile

Expo (SDK 57) + TypeScript app. Consumes the API over REST and imports contract
types from `@honeydo/shared`. UI is built from the typed design-token theme in
`src/theme/` — never raw hex (enforced by `npm run lint`; see DESIGN.md, FR-THEME-03).

## Scripts

Run from the repo root (npm workspaces) or with `-w @honeydo/mobile`:

- `npm run mobile` — start the Expo dev server (Metro).
- `npm run lint -w @honeydo/mobile` — ESLint, including the no-raw-hex guard.
- `npm run typecheck -w @honeydo/mobile` — `tsc --noEmit` (strict).
- `npm run prebuild -w @honeydo/mobile` — generate native projects (see below).

## Native build path — Expo Dev Client + prebuild (TC-STACK-01)

Phase 6 surfaces (home widget, live activity) are native iOS extensions that **cannot
run in Expo Go**. They require a custom **Dev Client** built from prebuilt native
projects. The configuration for that path lives here so Phase 6 can build on it:

- `expo-dev-client` is a dependency, so dev builds include the Dev Client runtime.
- `app.json` declares the iOS `bundleIdentifier` (`com.honeydo.app`) and Android
  `package` that the native projects and App Group entitlements key off.
- `newArchEnabled: true` matches the SDK 57 native baseline.

### Generating the native projects

```bash
# from apps/mobile
npm run prebuild            # expo prebuild --clean → creates ios/ and android/
npx expo run:ios            # build + launch the Dev Client on a simulator/device
```

`expo prebuild` downloads native templates and (on iOS) runs CocoaPods, so it needs
network access and the platform toolchain (Xcode for iOS). The generated `ios/` and
`android/` directories are git-ignored until Phase 6 commits a managed prebuild.

> Verified here: `expo-dev-client@6.0.21` resolves for SDK 57 and `npx expo config`
> validates the app config (bundle identifiers, sdkVersion 57). The actual prebuild +
> native build is exercised in Phase 6 when the first extension target is added.
