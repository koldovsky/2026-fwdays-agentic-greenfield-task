import 'dart:math' as math;

import 'package:vector_math/vector_math_64.dart';

// ─── Polyhedron ────────────────────────────────────────────────────────────

/// A regular polyhedron (dodecahedron or icosahedron) expressed as
/// unit-sphere vertices plus face topology and precomputed outward-
/// pointing face normals.
///
/// Construction strategy:
///
///   1. The **icosahedron** is built directly from its canonical
///      12 vertices — the corners of three mutually orthogonal golden
///      rectangles — normalized onto the unit sphere. Its 20 triangular
///      faces are then enumerated by finding all 3-cycles in the edge
///      graph, with each triangle's winding order corrected to
///      counter-clockwise when viewed from outside.
///
///   2. The **dodecahedron** is built as the dual of the icosahedron:
///      each dodecahedron vertex is the normalized centroid of an
///      icosahedron face (20 of them), and each dodecahedron pentagonal
///      face corresponds to one icosahedron vertex — namely, the 5
///      icosahedron faces that share that vertex, walked in cyclic
///      order. Winding is corrected the same way.
///
/// This approach avoids hand-transcribing a 12×5 pentagon face table
/// (a high-risk place for bugs) and gives us a unit-testable invariant:
/// every face normal computed from the resulting vertex order must be
/// outward-pointing.
class Polyhedron {
  Polyhedron._({
    required this.vertices,
    required this.faces,
    required this.faceNormals,
  });

  /// Vertices on the unit sphere (|v| ≈ 1 for all).
  final List<Vector3> vertices;

  /// Face topology: each inner list is the vertex indices of one face in
  /// counter-clockwise order when viewed from outside the polyhedron.
  ///
  ///   Icosahedron: 20 faces × 3 indices each
  ///   Dodecahedron: 12 faces × 5 indices each
  final List<List<int>> faces;

  /// Unit-length outward-pointing normal per face, parallel to [faces].
  final List<Vector3> faceNormals;

  /// Cached 20-face icosahedron (the D20 chord die).
  static final Polyhedron icosahedron = _buildIcosahedron();

  /// Cached 12-face dodecahedron (the D12 note die).
  static final Polyhedron dodecahedron = _buildDodecahedron();
}

// ─── Construction ──────────────────────────────────────────────────────────

/// The golden ratio φ = (1 + √5) / 2.
const double _phi = 1.6180339887498949;

/// Floating-point tolerance for edge-length equality when walking the
/// polyhedron's edge graph. The underlying coordinates are computed
/// from φ so values are well-conditioned; 1e-9 is comfortably below
/// any real numerical error.
const double _tol = 1e-9;

Polyhedron _buildIcosahedron() {
  // 12 vertices: corners of three mutually-orthogonal golden rectangles.
  final raw = <Vector3>[
    Vector3(0, 1, _phi),
    Vector3(0, 1, -_phi),
    Vector3(0, -1, _phi),
    Vector3(0, -1, -_phi),
    Vector3(1, _phi, 0),
    Vector3(1, -_phi, 0),
    Vector3(-1, _phi, 0),
    Vector3(-1, -_phi, 0),
    Vector3(_phi, 0, 1),
    Vector3(_phi, 0, -1),
    Vector3(-_phi, 0, 1),
    Vector3(-_phi, 0, -1),
  ];
  // Scale onto the unit sphere. For these raw coords, |v| = √(1+φ²).
  final invRadius = 1.0 / math.sqrt(1 + _phi * _phi);
  final vertices = raw.map((v) => v * invRadius).toList(growable: false);

  // Minimum pairwise distance = the edge length.
  final edgeLen = _minPairwiseDistance(vertices);

  // Enumerate all 3-cycles in the edge graph. For n=12 this is O(n³)
  // but runs once at construction, so the constant doesn't matter.
  bool isEdge(int i, int j) =>
      ((vertices[i] - vertices[j]).length - edgeLen).abs() < _tol;

  final faces = <List<int>>[];
  for (int i = 0; i < vertices.length; i++) {
    for (int j = i + 1; j < vertices.length; j++) {
      if (!isEdge(i, j)) continue;
      for (int k = j + 1; k < vertices.length; k++) {
        if (!isEdge(i, k) || !isEdge(j, k)) continue;
        faces.add(_ccwTriangle(i, j, k, vertices));
      }
    }
  }
  assert(
    faces.length == 20,
    'Icosahedron should have 20 faces, got ${faces.length}',
  );

  return Polyhedron._(
    vertices: vertices,
    faces: faces,
    faceNormals: _computeFaceNormals(vertices, faces),
  );
}

Polyhedron _buildDodecahedron() {
  final icosa = Polyhedron.icosahedron;

  // Dodecahedron vertex i = normalized centroid of icosahedron face i.
  final vertices = icosa.faces.map((face) {
    final c = (icosa.vertices[face[0]] +
            icosa.vertices[face[1]] +
            icosa.vertices[face[2]]) *
        (1.0 / 3.0);
    return c.normalized();
  }).toList(growable: false);
  assert(vertices.length == 20);

  // For each icosahedron vertex v, collect the 5 icosahedron faces that
  // contain it, then walk them cyclically: the next face in the cycle is
  // the one sharing edge (v, wNext) where wNext is the vertex immediately
  // after v (CCW) in the current face.
  final faces = <List<int>>[];
  for (int v = 0; v < icosa.vertices.length; v++) {
    final incident = <int>[];
    for (int fi = 0; fi < icosa.faces.length; fi++) {
      if (icosa.faces[fi].contains(v)) incident.add(fi);
    }
    assert(
      incident.length == 5,
      'Icosahedron vertex $v has ${incident.length} incident faces, expected 5',
    );

    final ordered = <int>[incident.first];
    final remaining = incident.toSet()..remove(incident.first);
    while (remaining.isNotEmpty) {
      final current = icosa.faces[ordered.last];
      final vi = current.indexOf(v);
      final wNext = current[(vi + 1) % 3];
      final next = remaining.firstWhere(
        (fi) => icosa.faces[fi].contains(v) && icosa.faces[fi].contains(wNext),
      );
      ordered.add(next);
      remaining.remove(next);
    }

    // Ensure outward-pointing winding. If the cross product of the first
    // two edges points away from the origin (same side as the vertices),
    // it's already CCW from outside; otherwise reverse.
    final p0 = vertices[ordered[0]];
    final p1 = vertices[ordered[1]];
    final p2 = vertices[ordered[2]];
    final normal = (p1 - p0).cross(p2 - p0);
    if (normal.dot(p0) < 0) {
      faces.add(ordered.reversed.toList());
    } else {
      faces.add(ordered);
    }
  }
  assert(faces.length == 12);

  return Polyhedron._(
    vertices: vertices,
    faces: faces,
    faceNormals: _computeFaceNormals(vertices, faces),
  );
}

// ─── Geometry helpers ──────────────────────────────────────────────────────

double _minPairwiseDistance(List<Vector3> vertices) {
  var min = double.infinity;
  for (int i = 0; i < vertices.length; i++) {
    for (int j = i + 1; j < vertices.length; j++) {
      final d = (vertices[i] - vertices[j]).length;
      if (d < min) min = d;
    }
  }
  return min;
}

/// Returns (i, j, k) in an order whose cross product points outward
/// (i.e., same hemisphere as the triangle's centroid relative to origin).
List<int> _ccwTriangle(int i, int j, int k, List<Vector3> vertices) {
  final a = vertices[i];
  final b = vertices[j];
  final c = vertices[k];
  final normal = (b - a).cross(c - a);
  final centroid = (a + b + c) * (1.0 / 3.0);
  return normal.dot(centroid) >= 0 ? [i, j, k] : [i, k, j];
}

List<Vector3> _computeFaceNormals(
  List<Vector3> vertices,
  List<List<int>> faces,
) {
  return faces.map((face) {
    final v0 = vertices[face[0]];
    final v1 = vertices[face[1]];
    final v2 = vertices[face[2]];
    final normal = (v1 - v0).cross(v2 - v0).normalized();
    assert(
      normal.dot(v0) > 0,
      'Face normal is inward-pointing; face winding is wrong',
    );
    return normal;
  }).toList(growable: false);
}

// ─── Settle rotation ───────────────────────────────────────────────────────

/// Computes `(rx, ry)` such that applying `R_x(rx) · R_y(ry)` to [normal]
/// yields `(0, 0, 1)` — i.e. the face with this normal ends up pointing
/// straight out of the screen.
///
/// Closed-form derivation:
///
///   Step 1: `R_y(ry)` is chosen to zero out the x-component.
///           After rotation, the x-component becomes
///             `nx·cos(ry) + nz·sin(ry)`.
///           Setting this to 0 and keeping the z-component positive:
///             `ry = atan2(-nx, nz)`.
///           The remaining vector is `(0, ny, √(nx² + nz²))`.
///
///   Step 2: `R_x(rx)` rotates `(0, ny, √(nx² + nz²))` to `(0, 0, 1)`.
///           Taking `rx = atan2(ny, √(nx² + nz²))` solves this exactly
///           for any unit input normal.
///
/// Used by [DiceStage]'s `_DieMotion` helper to land the tumble animation
/// precisely on the result face at t=1.
({double rx, double ry}) settleRotationFor(Vector3 normal) {
  final ry = math.atan2(-normal.x, normal.z);
  final rx = math.atan2(
    normal.y,
    math.sqrt(normal.x * normal.x + normal.z * normal.z),
  );
  return (rx: rx, ry: ry);
}
