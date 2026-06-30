# Dependency Map

```
HomeScreen  ──watches──▶  diceProvider
            ──watches──▶  arpeggioProvider
            ──listens──▶  shakeProvider           (NEW)
            ──reads─────▶  shakeProvider.state.enabled / .sensitivity
            ──uses──────▶  ShakeDetector          (NEW service)
                              └──subscribes──▶  accelerometerEventStream()  (sensors_plus)

ShakeNotifier  ──reads─▶  sharedPreferencesProvider

SettingsScreen  ──watches──▶  shakeProvider       (NEW)
                ──reads────▶  shakeProvider.notifier (NEW — for setters)

DiceNotifier  — unchanged (no new imports, no new callers from Dart — shake handler calls existing beginRoll())
AudioService  — unchanged
```

Boundary crossings:
- `lib/services/shake_detector.dart` → `package:sensors_plus/sensors_plus.dart` (new external dep)
- `lib/services/shake_detector.dart` → `package:flutter/foundation.dart` (`VoidCallback` only — no widget-binding dependency)
- `lib/screens/home_screen.dart` → `package:flutter/services.dart` (new: `HapticFeedback`)
- `lib/screens/home_screen.dart` → Flutter `WidgetsBindingObserver` / `ModalRoute` (first such use in the project)

No existing module imports change. No existing module's public API changes.
