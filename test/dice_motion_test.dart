import 'dart:math' as math;
import 'dart:ui';

import 'package:chord_dice/widgets/dice_motion.dart';
import 'package:flutter_test/flutter_test.dart';

const double _eps = 1e-9;

void main() {
  group('diceMotionPath', () {
    const start = Offset(20, 200);
    const end = Offset(280, 180);
    const arcPeak = 120.0;

    test('returns start exactly at t=0', () {
      final p = diceMotionPath(0, start, end, arcPeak);
      expect(p.dx, closeTo(start.dx, _eps));
      expect(p.dy, closeTo(start.dy, _eps));
    });

    test('returns end exactly at t=1', () {
      final p = diceMotionPath(1, start, end, arcPeak);
      expect(p.dx, closeTo(end.dx, _eps));
      expect(p.dy, closeTo(end.dy, _eps));
    });

    test('y equals end.dy at the landing moment (t=0.75)', () {
      final p = diceMotionPath(0.75, start, end, arcPeak);
      expect(p.dy, closeTo(end.dy, _eps));
    });

    test('x is monotonically non-decreasing when start.dx < end.dx', () {
      double prev = double.negativeInfinity;
      for (var i = 0; i <= 40; i++) {
        final t = i / 40;
        final x = diceMotionPath(t, start, end, arcPeak).dx;
        expect(x, greaterThanOrEqualTo(prev - _eps));
        prev = x;
      }
    });

    test('peak arc happens during travel phase and lifts the die upward', () {
      // Screen y grows downward, so "up" = smaller y. The peak should
      // be at some t in (0, 0.75) and should be lower than both
      // start.dy and end.dy.
      var minY = double.infinity;
      var minAtT = -1.0;
      for (var i = 0; i <= 100; i++) {
        final t = i / 100;
        final y = diceMotionPath(t, start, end, arcPeak).dy;
        if (y < minY) {
          minY = y;
          minAtT = t;
        }
      }
      expect(minAtT, greaterThan(0));
      expect(minAtT, lessThan(0.75));
      expect(minY, lessThan(start.dy));
      expect(minY, lessThan(end.dy));
    });

    test('degenerate case start == end still bounces vertically', () {
      const s = Offset(100, 100);
      final mid = diceMotionPath(0.5, s, s, 80);
      expect(mid.dx, closeTo(s.dx, _eps));
      // Arc peak reaches s.dy - arcPeak at the middle of the travel phase.
      // At t=0.5, phaseT = 2/3, arc = -80 * 4 * (2/3) * (1/3) = -71.111...
      expect(mid.dy, lessThan(s.dy));
    });
  });

  group('shortestAngleDelta', () {
    test('zero delta for identical angles', () {
      expect(shortestAngleDelta(0, 0), closeTo(0, _eps));
      expect(shortestAngleDelta(math.pi, math.pi), closeTo(0, _eps));
      expect(shortestAngleDelta(-5, -5), closeTo(0, _eps));
    });

    test('small positive delta: 0 → π/4 is +π/4', () {
      expect(shortestAngleDelta(0, math.pi / 4), closeTo(math.pi / 4, _eps));
    });

    test('wraps the long way around: 0 → 7π/4 is -π/4', () {
      expect(
        shortestAngleDelta(0, 7 * math.pi / 4),
        closeTo(-math.pi / 4, _eps),
      );
    });

    test('same angle expressed differently produces zero delta', () {
      // 0 and 2π are the same angle
      expect(shortestAngleDelta(0, 2 * math.pi).abs(), lessThan(_eps));
      // π and -π are the same angle (delta normalized to (-π, π])
      expect(shortestAngleDelta(math.pi, -math.pi).abs(), lessThan(_eps));
    });

    test('result is always in (-π, π] for 1000 random pairs', () {
      final rng = math.Random(42);
      for (var i = 0; i < 1000; i++) {
        final a = (rng.nextDouble() - 0.5) * 100;
        final b = (rng.nextDouble() - 0.5) * 100;
        final d = shortestAngleDelta(a, b);
        expect(d, greaterThan(-math.pi - _eps));
        expect(d, lessThanOrEqualTo(math.pi + _eps));
      }
    });

    test('delta plus its inverse round-trips to zero', () {
      final rng = math.Random(7);
      for (var i = 0; i < 200; i++) {
        final a = (rng.nextDouble() - 0.5) * 10;
        final b = (rng.nextDouble() - 0.5) * 10;
        final forward = shortestAngleDelta(a, b);
        // Applying the forward delta to a and then computing the delta
        // back to a should yield a round-trip close to zero (modulo
        // sign conventions at exactly ±π).
        final back = shortestAngleDelta(a + forward, a);
        expect((forward + back).abs(), lessThan(1e-9));
      }
    });
  });

  group('pickLanding', () {
    // Realistic phone-sized stage (approximately what the DiceStage
    // widget will get on a typical device after the header and
    // below-stage controls claim their height).
    const stage = Size(380, 440);
    const dieSize = 150.0;
    const expectedMinSep = dieSize * 0.9;

    test('returned position stays inside the margined stage rectangle', () {
      final rng = math.Random(1);
      for (var i = 0; i < 200; i++) {
        final pos = pickLanding(rng, stage, dieSize, null);
        final margin = dieSize / 2 + 8;
        expect(pos.dx, greaterThanOrEqualTo(margin));
        expect(pos.dx, lessThanOrEqualTo(stage.width - margin));
        expect(pos.dy, greaterThanOrEqualTo(margin));
        expect(pos.dy, lessThanOrEqualTo(stage.height - margin));
      }
    });

    test('respects minimum separation from avoidNear', () {
      final rng = math.Random(2);
      final center = Offset(stage.width / 2, stage.height / 2);
      for (var i = 0; i < 200; i++) {
        final pos = pickLanding(rng, stage, dieSize, center);
        expect(
          (pos - center).distance,
          greaterThanOrEqualTo(expectedMinSep - _eps),
          reason: 'pos=$pos distance=${(pos - center).distance}',
        );
      }
    });

    test('pathological tiny stage returns center without throwing', () {
      const tinyStage = Size(50, 50);
      final pos = pickLanding(math.Random(3), tinyStage, dieSize, null);
      expect(pos.dx, closeTo(25, _eps));
      expect(pos.dy, closeTo(25, _eps));
    });
  });
}
