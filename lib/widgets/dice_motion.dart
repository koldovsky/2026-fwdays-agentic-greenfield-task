import 'dart:math' as math;

import 'package:flutter/animation.dart';

// ─── Parametric motion path ────────────────────────────────────────────────

/// Returns the on-screen position of a die at parametric time [t] ∈ [0, 1]
/// traveling from [start] to [end] with a parabolic mid-trip arc of pixel
/// height [arcPeak] and a small damped bounce over the final 25% of the
/// animation.
///
/// The curve is split into two phases:
///
///   * **Travel (t ∈ [0, 0.75]):** horizontal position eases from
///     [start.dx] to [end.dx] with `Curves.easeOutCubic`; vertical
///     position linearly eases from [start.dy] to [end.dy] with
///     `Curves.easeInOut` and is pulled upward by a parabola peaking
///     at `t = 0.375` (the middle of the phase).
///
///   * **Bounce (t ∈ (0.75, 1]):** horizontal position continues to
///     coast into [end.dx] by t=1; vertical position is [end.dy] minus
///     a half-sine of amplitude `arcPeak × 0.18 × (1 - bounceT)`, so
///     the die lifts slightly, drops, and finishes exactly at [end].
///
/// Invariants verified by `test/dice_motion_test.dart`:
///
///   * `diceMotionPath(0, s, e, _) == s`
///   * `diceMotionPath(1, s, e, _) == e`
///   * `diceMotionPath(0.75, s, e, _).dy == e.dy`
///   * x is monotonic in t when `start.dx < end.dx`
///
/// Note: [arcPeak] is in screen pixels. Screen y grows *downward*, so
/// "up" in the arc corresponds to a *smaller* y value.
Offset diceMotionPath(double t, Offset start, Offset end, double arcPeak) {
  // X: smooth eased horizontal travel across the full duration.
  final tx = Curves.easeOutCubic.transform(t);
  final x = start.dx + (end.dx - start.dx) * tx;

  double y;
  if (t < 0.75) {
    final phaseT = t / 0.75;
    final linearY =
        start.dy + (end.dy - start.dy) * Curves.easeInOut.transform(phaseT);
    // Parabola in phaseT: 0 at endpoints, peak (= arcPeak) at phaseT = 0.5.
    final arc = -arcPeak * 4 * phaseT * (1 - phaseT);
    y = linearY + arc;
  } else {
    final bounceT = (t - 0.75) / 0.25;
    final amp = arcPeak * 0.18 * (1 - bounceT);
    // Half-sine: starts at 0, peaks at bounceT = 0.5, ends at 0.
    y = end.dy - amp * math.sin(bounceT * math.pi);
  }

  return Offset(x, y);
}

// ─── Angle delta ───────────────────────────────────────────────────────────

/// Returns the shortest signed angular distance from [from] to [to],
/// in the range `(-π, π]`.
///
/// This is what lets the rolling animation always perform a visible
/// tumble. `Dice3D`'s target rotation for each face normal is a fixed
/// angle determined by the polyhedron's geometry; when the same face
/// comes up on consecutive rolls, the raw difference collapses to zero.
/// Wrapping the delta through this helper (and then adding a fixed
/// multiple of 2π for the tumble on top) guarantees visible motion
/// regardless of which face was rolled previously.
double shortestAngleDelta(double from, double to) {
  const twoPi = 2 * math.pi;
  var d = ((to - from) % twoPi + twoPi) % twoPi; // [0, 2π)
  if (d > math.pi) d -= twoPi; // (-π, π]
  return d;
}

// ─── Landing picker ────────────────────────────────────────────────────────

/// Picks a random landing position inside [stage], keeping the die's
/// half-size plus an 8 px glow margin away from the edges. If
/// [avoidNear] is non-null, the returned position is at least
/// `dieSize × 0.9` pixels away from it so the two dice don't visually
/// overlap when they settle.
///
/// The `0.9` multiplier is below 1.0 because `_Dice3DPainter` only
/// fills ~84% of the widget's bounding box with the actual polyhedron
/// (the rest is padding for the glow effect), so the *visible* dice
/// stay clearly separated even when their bounding boxes come within
/// 90% of their size of each other. This looser constraint also
/// guarantees the separation is satisfiable on realistic phone-sized
/// stages without the fallback path.
///
/// Uses [rng] so callers can inject a seeded `Random` for
/// reproducible tests. Falls back to the stage corner farthest from
/// [avoidNear] after 20 failed attempts (tight stages, pathological
/// seeds).
Offset pickLanding(
  math.Random rng,
  Size stage,
  double dieSize,
  Offset? avoidNear,
) {
  final margin = dieSize / 2 + 8;
  final minSeparation = dieSize * 0.9;
  final widthRange = stage.width - 2 * margin;
  final heightRange = stage.height - 2 * margin;

  // Pathological case: stage is smaller than a single die can fit in.
  // Return the center; the caller is responsible for the visual mess.
  if (widthRange <= 0 || heightRange <= 0) {
    return Offset(stage.width / 2, stage.height / 2);
  }

  for (var i = 0; i < 20; i++) {
    final pos = Offset(
      margin + rng.nextDouble() * widthRange,
      margin + rng.nextDouble() * heightRange,
    );
    if (avoidNear == null || (pos - avoidNear).distance >= minSeparation) {
      return pos;
    }
  }

  // Deterministic fallback: pick the stage corner farthest from
  // [avoidNear]. This may still violate [minSeparation] on pathological
  // stages — that's acceptable; the random path succeeds for all
  // realistic phone-sized stages.
  if (avoidNear == null) {
    return Offset(stage.width / 2, stage.height / 2);
  }
  final corners = [
    Offset(margin, margin),
    Offset(stage.width - margin, margin),
    Offset(margin, stage.height - margin),
    Offset(stage.width - margin, stage.height - margin),
  ];
  var best = corners.first;
  var bestDist = (best - avoidNear).distance;
  for (var i = 1; i < corners.length; i++) {
    final d = (corners[i] - avoidNear).distance;
    if (d > bestDist) {
      best = corners[i];
      bestDist = d;
    }
  }
  return best;
}
