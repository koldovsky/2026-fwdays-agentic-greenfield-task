import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:vector_math/vector_math_64.dart' show Vector3;

import '../constants.dart';
import 'polyhedron.dart';

/// A 3D-projected polyhedron die with chord/note-face labels.
///
/// Renders a **dodecahedron** for `faceCount == 12` (the D12 note die)
/// and an **icosahedron** for `faceCount == 20` (the D20 chord die),
/// using a single `CustomPainter` that rotates vertices in software and
/// draws the faces back-to-front. Visual style is "hybrid": glowing
/// edges in [accentColor] plus low-opacity translucent face fills, with
/// per-face labels whose size and opacity fade with the face normal's
/// z-component (back faces culled entirely).
///
/// `Dice3D` is now a pure render widget: it is given rotation angles
/// and a rolling flag, and draws the polyhedron for that orientation.
/// Animation state (settle rotation, tumble offsets, per-roll
/// accumulation) lives in [DiceStage], which also owns each die's
/// on-screen position.
class Dice3D extends StatefulWidget {
  const Dice3D({
    super.key,
    required this.faceCount,
    required this.faces,
    required this.rotX,
    required this.rotY,
    required this.accentColor,
    required this.rolling,
    this.size = 150,
  });

  /// Either 12 (dodecahedron) or 20 (icosahedron).
  final int faceCount;

  /// Labels in face-index order. Must have length equal to [faceCount].
  final List<String> faces;

  /// X-axis rotation in radians. Driven by the parent [DiceStage].
  final double rotX;

  /// Y-axis rotation in radians. Driven by the parent [DiceStage].
  final double rotY;

  /// Whether the parent is currently rolling this die. Drives the
  /// `flutter_animate` shimmer overlay — no other internal effect.
  final bool rolling;

  /// Accent color for edges, fills, and non-front labels.
  final Color accentColor;

  /// Pixel size of the square area the die is drawn into.
  final double size;

  @override
  State<Dice3D> createState() => _Dice3DState();
}

class _Dice3DState extends State<Dice3D> {
  late Map<String, _CachedLabel> _labelCache;

  Polyhedron get _polyhedron =>
      widget.faceCount == 12 ? Polyhedron.dodecahedron : Polyhedron.icosahedron;

  @override
  void initState() {
    super.initState();
    _rebuildLabelCache();
  }

  @override
  void didUpdateWidget(Dice3D oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_listEquals(oldWidget.faces, widget.faces) ||
        oldWidget.accentColor != widget.accentColor) {
      _rebuildLabelCache();
    }
  }

  void _rebuildLabelCache() {
    _labelCache = {
      for (final label in widget.faces)
        label: _CachedLabel(
          front: _layoutLabel(label, isFront: true),
          back: _layoutLabel(label, isFront: false),
        ),
    };
  }

  TextPainter _layoutLabel(String label, {required bool isFront}) {
    // Layout at the maximum font size used in paint() (22px).
    // paint() scales down via canvas.scale for smaller sizes, so we
    // never re-layout per frame.
    return TextPainter(
      text: TextSpan(
        text: label,
        style: TextStyle(
          color: isFront ? Colors.white : widget.accentColor,
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
          shadows: isFront
              ? [Shadow(color: widget.accentColor, blurRadius: 6)]
              : null,
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    )..layout();
  }

  @override
  Widget build(BuildContext context) {
    assert(
      widget.faces.length == widget.faceCount,
      'Dice3D expects ${widget.faceCount} labels, got ${widget.faces.length}',
    );
    return SizedBox.square(
      dimension: widget.size,
      child: CustomPaint(
        size: Size.square(widget.size),
        painter: _Dice3DPainter(
          polyhedron: _polyhedron,
          labels: widget.faces,
          labelCache: _labelCache,
          rotX: widget.rotX,
          rotY: widget.rotY,
          accentColor: widget.accentColor,
        ),
      ),
    ).animate(target: widget.rolling ? 1 : 0).shimmer(
          duration: kRollAnimationDuration,
          color: widget.accentColor.withValues(alpha: 0.3),
        );
  }
}

class _CachedLabel {
  _CachedLabel({required this.front, required this.back});
  final TextPainter front;
  final TextPainter back;
}

// ─── Painter ───────────────────────────────────────────────────────────────

class _Dice3DPainter extends CustomPainter {
  _Dice3DPainter({
    required this.polyhedron,
    required this.labels,
    required this.labelCache,
    required this.rotX,
    required this.rotY,
    required this.accentColor,
  });

  final Polyhedron polyhedron;
  final List<String> labels;
  final Map<String, _CachedLabel> labelCache;
  final double rotX;
  final double rotY;
  final Color accentColor;

  /// Perspective strength. `0` gives orthographic projection, `~0.4`
  /// gives a noticeable depth without exaggerated distortion.
  static const double _perspective = 0.4;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    // Leave margin for the glow so it doesn't clip.
    final radius = size.shortestSide * 0.42;

    // Precompute rotated vertices and face normals.
    final cx = math.cos(rotX), sx = math.sin(rotX);
    final cy = math.cos(rotY), sy = math.sin(rotY);

    Vector3 rotate(Vector3 v) {
      // R_y then R_x
      final x1 = v.x * cy + v.z * sy;
      final y1 = v.y;
      final z1 = -v.x * sy + v.z * cy;
      return Vector3(
        x1,
        y1 * cx - z1 * sx,
        y1 * sx + z1 * cx,
      );
    }

    final rotatedVerts =
        polyhedron.vertices.map(rotate).toList(growable: false);
    final rotatedNormals =
        polyhedron.faceNormals.map(rotate).toList(growable: false);

    // Build per-face data for sorting.
    final faceData = <_FaceRenderData>[];
    for (var i = 0; i < polyhedron.faces.length; i++) {
      final face = polyhedron.faces[i];
      final normal = rotatedNormals[i];
      // Cheap backface cull — skip faces whose normal points strongly away.
      if (normal.z < -0.05) continue;

      final verts3d = face.map((idx) => rotatedVerts[idx]).toList();
      var meanZ = 0.0;
      for (final v in verts3d) {
        meanZ += v.z;
      }
      meanZ /= verts3d.length;

      final projected = verts3d.map((v) {
        final denom = 1 - v.z * _perspective;
        return Offset(
          centerX + radius * v.x / denom,
          centerY + radius * v.y / denom,
        );
      }).toList();

      faceData.add(_FaceRenderData(
        index: i,
        meanZ: meanZ,
        facing: normal.z,
        projected: projected,
      ));
    }

    // Painter's algorithm: back (smallest z) first, front (largest z) last.
    faceData.sort((a, b) => a.meanZ.compareTo(b.meanZ));

    // Identify the currently front-most face for the "halo" highlight.
    // After settle, this is resultIndex; during rolling, it tracks
    // whichever face is most forward-facing, which gives the slot-
    // machine readout feel naturally.
    var frontMostIndex = -1;
    var maxFacing = -double.infinity;
    for (final fd in faceData) {
      if (fd.facing > maxFacing) {
        maxFacing = fd.facing;
        frontMostIndex = fd.index;
      }
    }

    // Paint each face.
    final fillPaint = Paint()..style = PaintingStyle.fill;
    final strokePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeJoin = StrokeJoin.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);

    for (final fd in faceData) {
      final path = Path()..moveTo(fd.projected.first.dx, fd.projected.first.dy);
      for (var i = 1; i < fd.projected.length; i++) {
        path.lineTo(fd.projected[i].dx, fd.projected[i].dy);
      }
      path.close();

      final alpha = _smoothstep(0.0, 0.6, fd.facing);
      final isFront = fd.index == frontMostIndex;

      fillPaint.color = accentColor.withValues(
        alpha: 0.12 * alpha + (isFront ? 0.22 : 0.0),
      );
      canvas.drawPath(path, fillPaint);

      strokePaint.color = accentColor.withValues(
        alpha: 0.4 + 0.6 * alpha,
      );
      canvas.drawPath(path, strokePaint);
    }

    // Draw labels on top of all faces using the pre-laid-out cache.
    // Scale from 22px (cache layout size) to the per-face target size.
    // Per-frame opacity applied via saveLayer + ColorFilter.modulate.
    for (final fd in faceData) {
      final labelAlpha = _smoothstep(0.15, 0.6, fd.facing);
      if (labelAlpha <= 0) continue;

      final centroid = _centroid(fd.projected);
      final isFront = fd.index == frontMostIndex;
      final label = labels[fd.index];
      final cached = labelCache[label]!;
      final tp = isFront ? cached.front : cached.back;

      final targetSize = (9 + 12 * labelAlpha).clamp(9.0, 22.0);
      final scale = targetSize / 22.0;

      canvas.save();
      canvas.translate(centroid.dx, centroid.dy);
      canvas.scale(scale);
      canvas.saveLayer(
        Rect.fromCenter(
          center: Offset.zero,
          width: tp.width,
          height: tp.height,
        ),
        Paint()
          ..colorFilter = ColorFilter.mode(
            Colors.white.withValues(alpha: labelAlpha),
            BlendMode.modulate,
          ),
      );
      tp.paint(canvas, Offset(-tp.width / 2, -tp.height / 2));
      canvas.restore();
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _Dice3DPainter oldDelegate) {
    return oldDelegate.rotX != rotX ||
        oldDelegate.rotY != rotY ||
        oldDelegate.polyhedron != polyhedron ||
        oldDelegate.accentColor != accentColor ||
        !_listEquals(oldDelegate.labels, labels);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

class _FaceRenderData {
  _FaceRenderData({
    required this.index,
    required this.meanZ,
    required this.facing,
    required this.projected,
  });

  final int index;
  final double meanZ;
  final double facing;
  final List<Offset> projected;
}

Offset _centroid(List<Offset> points) {
  var sx = 0.0, sy = 0.0;
  for (final p in points) {
    sx += p.dx;
    sy += p.dy;
  }
  return Offset(sx / points.length, sy / points.length);
}

double _smoothstep(double edge0, double edge1, double x) {
  final t = ((x - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);
  return t * t * (3 - 2 * t);
}

bool _listEquals<T>(List<T> a, List<T> b) {
  if (identical(a, b)) return true;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
