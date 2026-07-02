/**
 * `@bacons/apple-targets` config for the Honeydo Live Activity (ActivityKit) extension.
 * `expo prebuild` reads this to generate the WidgetKit/ActivityKit target and wire the
 * shared App Group so the app and the extension can exchange the running-entry + stop
 * request (TC-NATIVE-01). The Swift/SwiftUI sources live alongside this file.
 */
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'HoneydoLiveActivity',
  deploymentTarget: '16.2',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.blackflamy.honeydo'],
  },
};
