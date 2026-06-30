import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../constants.dart';

// ─── Clock helper ─────────────────────────────────────────────────────────────

DateTime _defaultClock() => DateTime.now();

// ─── ShakeDetector ────────────────────────────────────────────────────────────

class ShakeDetector {
  ShakeDetector({
    required Stream<AccelerometerEvent> stream,
    required double thresholdMps2,
    required VoidCallback onShake,
    bool Function()? shouldIgnoreEvent,
    Duration minIntervalBetweenShakes = kShakeMinIntervalBetweenEvents,
    DateTime Function() clock = _defaultClock,
  })  : _stream = stream,
        _threshold = thresholdMps2,
        _onShake = onShake,
        _shouldIgnoreEvent = shouldIgnoreEvent,
        _minInterval = minIntervalBetweenShakes,
        _clock = clock;

  final Stream<AccelerometerEvent> _stream;
  double _threshold;
  final VoidCallback _onShake;
  final bool Function()? _shouldIgnoreEvent;
  final Duration _minInterval;
  final DateTime Function() _clock;

  StreamSubscription<AccelerometerEvent>? _sub;
  DateTime? _lastShakeAt;

  void start() {
    if (_sub != null) return;
    _sub = _stream.listen(
      _onEvent,
      onError: (Object e) => debugPrint('ShakeDetector stream error: $e'),
    );
  }

  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
  }

  void updateThreshold(double newThresholdMps2) {
    _threshold = newThresholdMps2;
  }

  void _onEvent(AccelerometerEvent e) {
    final raw = sqrt(e.x * e.x + e.y * e.y + e.z * e.z);
    final mag = (raw - 9.81).abs();
    if (mag < _threshold) return;
    if (_shouldIgnoreEvent?.call() == true) return;
    final now = _clock();
    if (_lastShakeAt != null && now.difference(_lastShakeAt!) < _minInterval) {
      return;
    }
    _lastShakeAt = now;
    _onShake();
  }
}
