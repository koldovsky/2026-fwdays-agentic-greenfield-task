import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:sensors_plus/sensors_plus.dart';

import 'package:chord_dice/constants.dart';
import 'package:chord_dice/services/shake_detector.dart';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Returns an AccelerometerEvent whose magnitude - 9.81 equals [netMps2].
/// Uses a single axis (x) for simplicity.
AccelerometerEvent _event(double netMps2) {
  // sqrt(x²) - 9.81 = netMps2  →  x = netMps2 + 9.81
  return AccelerometerEvent(
    netMps2 + 9.81,
    0,
    0,
    DateTime.fromMicrosecondsSinceEpoch(0),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

void main() {
  group('ShakeDetector', () {
    test('trigger: above-threshold event fires onShake once', () {
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
      );
      detector.start();
      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 1);
      ctrl.close();
    });

    test('sub-threshold: below-threshold event does not fire', () {
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
      );
      detector.start();
      ctrl.add(_event(kShakeThresholdMedium - 1));
      expect(count, 0);
      ctrl.close();
    });

    test('sensitivity switch via updateThreshold', () {
      var fakeNow = DateTime(2026, 1, 1, 0, 0, 1);
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium, // 18.0
        onShake: () => count++,
        clock: () => fakeNow,
      );
      detector.start();

      // 18.5 net > medium threshold (18.0) → fires
      ctrl.add(_event(18.5));
      expect(count, 1);

      // Switch threshold on the live detector — no re-subscribe.
      detector.updateThreshold(kShakeThresholdLow); // 25.0
      fakeNow = fakeNow.add(const Duration(seconds: 2)); // past debounce

      // 18.5 net < low threshold (25.0) → does NOT fire
      ctrl.add(_event(18.5));
      expect(count, 1); // still 1

      ctrl.close();
    });

    test('updateThreshold on live detector switches sensitivity', () {
      var fakeNow = DateTime(2026, 1, 1);
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium, // 18.0
        onShake: () => count++,
        clock: () => fakeNow,
      );
      detector.start();

      // 18.5 > 18.0 → fires
      ctrl.add(_event(18.5));
      expect(count, 1);

      // switch to Low threshold (25.0) — no re-subscribe
      detector.updateThreshold(kShakeThresholdLow);

      // advance past debounce
      fakeNow = fakeNow.add(const Duration(seconds: 2));

      // 18.5 < 25.0 → does NOT fire
      ctrl.add(_event(18.5));
      expect(count, 1);

      ctrl.close();
    });

    test('shouldIgnoreEvent gate suppresses above-threshold events', () {
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      var ignoring = true;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
        shouldIgnoreEvent: () => ignoring,
      );
      detector.start();

      ctrl.add(_event(kShakeThresholdMedium + 5));
      expect(count, 0); // gated

      ignoring = false;
      ctrl.add(_event(kShakeThresholdMedium + 5));
      expect(count, 1); // now fires

      ctrl.close();
    });

    test('debounce: rapid events within interval fire only once', () {
      var fakeNow = DateTime(2026, 1, 1);
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
        minIntervalBetweenShakes: kShakeMinIntervalBetweenEvents,
        clock: () => fakeNow,
      );
      detector.start();

      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 1);

      // Still within the debounce window
      fakeNow = fakeNow.add(
          kShakeMinIntervalBetweenEvents - const Duration(milliseconds: 1));
      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 1); // not fired again

      // Now past the window
      fakeNow = fakeNow.add(const Duration(milliseconds: 2));
      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 2);

      ctrl.close();
    });

    test('stream error does not crash and does not fire onShake', () {
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
      );
      detector.start();
      ctrl.addError('nope');
      expect(count, 0);
      ctrl.close();
    });

    test('start() is idempotent — double-start does not double-subscribe', () {
      final ctrl = StreamController<AccelerometerEvent>.broadcast(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
      );
      detector.start();
      detector.start(); // second call is a no-op
      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 1);
      ctrl.close();
    });

    test('stop() is idempotent — double-stop does not throw', () async {
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () {},
      );
      detector.start();
      await detector.stop();
      await detector.stop(); // second stop is a no-op
      ctrl.close();
    });

    test('stop() prevents further events from firing', () async {
      final ctrl = StreamController<AccelerometerEvent>(sync: true);
      var count = 0;
      final detector = ShakeDetector(
        stream: ctrl.stream,
        thresholdMps2: kShakeThresholdMedium,
        onShake: () => count++,
      );
      detector.start();
      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 1);

      await detector.stop();
      ctrl.add(_event(kShakeThresholdMedium + 1));
      expect(count, 1); // not fired after stop

      ctrl.close();
    });
  });
}
