import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../constants.dart';
import 'dice_3d.dart';
import 'dice_motion.dart';
import 'polyhedron.dart';

// ─── DiceStage ─────────────────────────────────────────────────────────────

/// A big central stage that hosts the D12 note die and the D20 chord die
/// and drives their shared rolling animation.
///
/// The stage owns one [AnimationController] for both dice (they roll in
/// sync), two [_DieMotion] helpers that hold the per-die start/end
/// position and rotation, and a [LayoutBuilder] that gives us the real
/// available rectangle so the randomized landing positions can stay
/// inside the screen.
///
/// On every roll (detected when [rolling] goes false → true, or when
/// [noteIndex]/[chordIndex] change mid-roll), the stage:
///
///   1. Reads the current animation `t`.
///   2. Picks fresh random landing positions for both dice via
///      [pickLanding], ensuring the dice don't overlap at rest.
///   3. Calls [_DieMotion.prepareRoll] on both helpers so the next
///      segment starts exactly from where the previous one ended and
///      ends with each face's correct settle rotation plus a mandatory
///      `tumbleX` / `tumbleY` tumble on top.
///   4. Resets and plays the shared `AnimationController`.
///
/// [Dice3D] itself is now a pure render widget — the stage passes it
/// the current rotation angles and a `rolling` flag on every frame.
class DiceStage extends StatefulWidget {
  const DiceStage({
    super.key,
    required this.noteLabels,
    required this.chordLabels,
    required this.noteIndex,
    required this.chordIndex,
    required this.rolling,
    required this.onSettled,
    this.dieSize = 150,
  });

  final List<String> noteLabels;
  final List<String> chordLabels;
  final int noteIndex;
  final int chordIndex;
  final bool rolling;
  final VoidCallback onSettled;
  final double dieSize;

  @override
  State<DiceStage> createState() => _DiceStageState();
}

class _DiceStageState extends State<DiceStage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final _DieMotion _d12;
  late final _DieMotion _d20;
  final _rng = math.Random();

  /// Most recent stage size observed from LayoutBuilder. Used by
  /// [didUpdateWidget] to compute new landing positions before the
  /// next rebuild.
  Size? _stageSize;

  /// Pending roll trigger. We may observe a roll start in
  /// `didUpdateWidget` before the first [LayoutBuilder] callback has
  /// given us a concrete [Size]. In that case we set this flag and the
  /// first build fires the roll as soon as a size is available.
  bool _pendingRoll = false;

  /// The arc peak used for the current animation segment, in pixels.
  ///
  /// Stored so both [_startRoll] and [AnimatedBuilder] always use the
  /// same value — keeping [_DieMotion.position] consistent across the
  /// continuity snapshot and the render loop. Capped per roll so the
  /// arc never crosses the top stage boundary (chord card) or the bottom
  /// boundary (ROLL button area).
  double _arcPeak = 0;

  /// Extra bottom padding (px) removed from the pick-landing stage rect
  /// so settled dice never overlap the ROLL button region below the stage.
  static const _kBottomPad = 20.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: kRollAnimationDuration,
    );
    _d12 = _DieMotion(Polyhedron.dodecahedron)..initializeAt(widget.noteIndex);
    _d20 = _DieMotion(Polyhedron.icosahedron)..initializeAt(widget.chordIndex);
  }

  @override
  void didUpdateWidget(DiceStage oldWidget) {
    super.didUpdateWidget(oldWidget);
    final rollStarted = widget.rolling && !oldWidget.rolling;
    final indicesChanged = widget.noteIndex != oldWidget.noteIndex ||
        widget.chordIndex != oldWidget.chordIndex;
    if (rollStarted || (widget.rolling && indicesChanged)) {
      if (_stageSize != null) {
        _startRoll(_stageSize!);
      } else {
        _pendingRoll = true;
      }
    } else if (indicesChanged && !widget.rolling) {
      // History tap: snap both dice to the correct settle rotation instantly,
      // without any travel animation. Position stays wherever each die landed.
      _d12.snapToFace(widget.noteIndex);
      _d20.snapToFace(widget.chordIndex);
      setState(() {});
    }
  }

  void _startRoll(Size size) {
    _pendingRoll = false;
    final currentT = _controller.value;

    // ── Step 1: Snapshot the current visual state ─────────────────────────
    // Use the STORED _arcPeak so position() is consistent with the last
    // rendered frame. Handles first-roll where dice are still at Offset.zero.
    final isFirstRoll = _d12.startPos == Offset.zero && currentT == 0;
    final curPos12 = isFirstRoll
        ? Offset(size.width * 0.35, size.height * 0.5)
        : _d12.position(currentT, _arcPeak);
    final curPos20 = isFirstRoll
        ? Offset(size.width * 0.65, size.height * 0.5)
        : _d20.position(currentT, _arcPeak);
    final curRx12 = _d12.rotX(currentT);
    final curRy12 = _d12.rotY(currentT);
    final curRx20 = _d20.rotX(currentT);
    final curRy20 = _d20.rotY(currentT);

    // ── Step 2: Park each die at its current state ────────────────────────
    // With startPos == endPos and currentT reset to 0, position(0) == startPos
    // is an exact invariant of diceMotionPath, so prepareRoll gets a clean
    // start regardless of what _arcPeak will be for the new segment.
    _d12
      ..startPos = curPos12
      ..endPos = curPos12
      ..startRx = curRx12
      ..endRx = curRx12
      ..startRy = curRy12
      ..endRy = curRy12;
    _d20
      ..startPos = curPos20
      ..endPos = curPos20
      ..startRx = curRx20
      ..endRx = curRx20
      ..startRy = curRy20
      ..endRy = curRy20;

    // ── Step 3: Pick landing positions inside the safe zone ───────────────
    // Shrink the stage height by _kBottomPad so dice never settle over
    // the ROLL button below the stage boundary.
    final safeSize = Size(size.width, size.height - _kBottomPad);
    final landing12 = pickLanding(_rng, safeSize, widget.dieSize, null);
    final landing20 =
        pickLanding(_rng, safeSize, widget.dieSize * 1.2, landing12);

    // ── Step 4: Compute a safe arc peak ───────────────────────────────────
    // The parabolic arc reaches its highest point ≈ min(startY, endY) - peak.
    // Capping at minY × 0.85 ensures y_min ≥ 0.15 × minY > 0 throughout the
    // animation, so dice never cross the top boundary into the chord card.
    final minY =
        [curPos12.dy, curPos20.dy, landing12.dy, landing20.dy].reduce(math.min);
    _arcPeak = math.min(size.height * 0.3, minY * 0.85);

    // ── Step 5: Prepare and launch ────────────────────────────────────────
    // currentT: 0 because the die is parked — position(0, _arcPeak) == startPos.
    _d12.prepareRoll(
      currentT: 0,
      arcPeak: _arcPeak,
      newLanding: landing12,
      resultIndex: widget.noteIndex,
    );
    _d20.prepareRoll(
      currentT: 0,
      arcPeak: _arcPeak,
      newLanding: landing20,
      resultIndex: widget.chordIndex,
    );

    _controller.forward(from: 0).whenComplete(() {
      if (mounted) widget.onSettled();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.biggest;
        _stageSize = size;

        // If we've been waiting for a stage size to fire a pending
        // roll, do it now that we have one. Scheduled on the next
        // frame so we don't call `forward` during build.
        if (_pendingRoll) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _pendingRoll) _startRoll(size);
          });
        }

        // On the first build, place dice at their symmetric starting
        // points and set a sensible initial arcPeak.
        if (_d12.startPos == Offset.zero && _d12.endPos == Offset.zero) {
          _d12.startPos = Offset(size.width * 0.35, size.height * 0.5);
          _d12.endPos = _d12.startPos;
          _d20.startPos = Offset(size.width * 0.65, size.height * 0.5);
          _d20.endPos = _d20.startPos;
          _arcPeak = size.height * 0.3;
        }

        return AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final t = _controller.value;
            // Use the stored _arcPeak — always matches what _startRoll used,
            // so position() is consistent between roll setup and rendering.
            final p12 = _d12.position(t, _arcPeak);
            final p20 = _d20.position(t, _arcPeak);
            final halfD12 = widget.dieSize / 2;
            final d20Size = widget.dieSize * 1.2;
            final halfD20 = d20Size / 2;

            return Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  left: p12.dx - halfD12,
                  top: p12.dy - halfD12,
                  child: Dice3D(
                    faceCount: 12,
                    faces: widget.noteLabels,
                    rotX: _d12.rotX(t),
                    rotY: _d12.rotY(t),
                    accentColor: Theme.of(context).colorScheme.secondary,
                    rolling: widget.rolling,
                    size: widget.dieSize,
                  ),
                ),
                Positioned(
                  left: p20.dx - halfD20,
                  top: p20.dy - halfD20,
                  child: Dice3D(
                    faceCount: 20,
                    faces: widget.chordLabels,
                    rotX: _d20.rotX(t),
                    rotY: _d20.rotY(t),
                    accentColor: Theme.of(context).colorScheme.primary,
                    rolling: widget.rolling,
                    size: d20Size,
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

// ─── Per-die motion helper ─────────────────────────────────────────────────

/// Holds the current (start, end) position and rotation for one die
/// plus a method to sample the animated frame at parametric time `t`.
/// Lives in this file (not `dice_motion.dart`) because it's only used
/// by [DiceStage] and keeping it private avoids widening the API.
class _DieMotion {
  _DieMotion(this.polyhedron);

  final Polyhedron polyhedron;
  Offset startPos = Offset.zero;
  Offset endPos = Offset.zero;
  double startRx = 0, endRx = 0;
  double startRy = 0, endRy = 0;

  /// Pre-sets the die's rotation to the identity settle for the given
  /// face so the very first frame shows the correct face forward.
  /// Position stays at `Offset.zero` until the LayoutBuilder gives us
  /// a real stage size.
  void initializeAt(int resultIndex) {
    final (:rx, :ry) = settleRotationFor(polyhedron.faceNormals[resultIndex]);
    startRx = rx;
    endRx = rx;
    startRy = ry;
    endRy = ry;
  }

  /// Snaps the die's rotation to the correct settle position for [resultIndex]
  /// without touching position. Used by history-tap replay so the face
  /// updates instantly in place, with no travel animation.
  void snapToFace(int resultIndex) {
    final (:rx, :ry) = settleRotationFor(polyhedron.faceNormals[resultIndex]);
    startRx = rx;
    endRx = rx;
    startRy = ry;
    endRy = ry;
  }

  Offset position(double t, double arcPeak) =>
      diceMotionPath(t, startPos, endPos, arcPeak);

  double rotX(double t) =>
      ui.lerpDouble(startRx, endRx, Curves.easeOutCubic.transform(t))!;

  double rotY(double t) =>
      ui.lerpDouble(startRy, endRy, Curves.easeOutCubic.transform(t))!;

  /// Prepare the next animation segment. Call this with the current
  /// animation `t` (before resetting the controller) so the new
  /// segment starts exactly where the previous one left off.
  void prepareRoll({
    required double currentT,
    required double arcPeak,
    required Offset newLanding,
    required int resultIndex,
  }) {
    final cPos = position(currentT, arcPeak);
    final cRx = rotX(currentT);
    final cRy = rotY(currentT);
    final (:rx, :ry) = settleRotationFor(polyhedron.faceNormals[resultIndex]);

    startPos = cPos;
    endPos = newLanding;
    startRx = cRx;
    startRy = cRy;
    endRx = cRx + shortestAngleDelta(cRx, rx) + _tumbleX;
    endRy = cRy + shortestAngleDelta(cRy, ry) + _tumbleY;
  }
}

const double _tumbleX = 4 * math.pi; // 2 full X-axis spins per roll
const double _tumbleY = 6 * math.pi; // 3 full Y-axis spins per roll
