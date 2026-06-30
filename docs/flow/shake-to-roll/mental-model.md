# Mental Model

## Lifecycle state machine for the accelerometer subscription

A single boolean — "should the detector currently be listening?" — is derived from four inputs. Whenever any input changes, Home recomputes it and starts or stops the subscription.

```
shouldListen =
   (shakeProvider.state.enabled == true)
   AND (AppLifecycleState == resumed)
   AND (ModalRoute.of(context)?.isCurrent == true)
   AND (the State is mounted)
```

Transitions that re-evaluate:
- `initState` → evaluate (subscribe if true).
- `didChangeDependencies` → evaluate (route-on-top change).
- `didChangeAppLifecycleState` → evaluate (foreground/background).
- `ref.listen(shakeProvider)` callback → evaluate (toggle flip + update threshold if sensitivity changed).
- `deactivate` → unconditional stop (route is being removed or state being disposed).
- `dispose` → final stop + observer unregister.

Invariants:
- The detector is never running while Home is off-screen or the app is backgrounded.
- The detector threshold is always in sync with `shakeProvider.state.sensitivity`.
- Hot reload-safe because `dispose` → `initState` symmetrically tears down and rebuilds.

## Event flow on a successful shake

```
AccelerometerEvent (sensors_plus stream)
   → ShakeDetector.magnitude check (above threshold?)
   → ShakeDetector.debounce (≥ kShakeMinIntervalBetweenEvents since last emission?)
   → onShake callback (provided by HomeScreen)
      → HomeScreen reads diceProvider.rollState (gate: must NOT be rolling)
      → HapticFeedback.mediumImpact()
      → ref.read(diceProvider.notifier).beginRoll()
      → (existing roll lifecycle takes over; audio cancellation via _playGeneration if arpeggio trail was playing)
```

The rolling-state gate lives in `HomeScreen`, not in `ShakeDetector`, for two reasons: the detector stays a pure, provider-agnostic helper; and the gate needs a *fresh* `ref.read` each invocation, which a pure helper with captured state would not give.

Actually — on reflection, the `shouldIgnoreEvent` hook on `ShakeDetector` exists precisely so the gate can live there as a pluggable predicate. `HomeScreen` passes a closure that calls `ref.read(diceProvider).rollState == RollState.rolling`. This keeps the detector reusable and testable with synthetic `shouldIgnoreEvent` functions.
