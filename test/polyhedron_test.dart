import 'dart:math' as math;

import 'package:chord_dice/widgets/polyhedron.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vector_math/vector_math_64.dart';

/// Numerical tolerance for geometric assertions. The underlying
/// computations are built from φ and square roots, so everything lives
/// well within 1e-10 — picking 1e-9 gives a safety margin.
const double _eps = 1e-9;

void main() {
  group('Icosahedron', () {
    final ico = Polyhedron.icosahedron;

    test('has 12 vertices and 20 triangular faces', () {
      expect(ico.vertices.length, 12);
      expect(ico.faces.length, 20);
      for (final face in ico.faces) {
        expect(face.length, 3);
        for (final idx in face) {
          expect(idx, inInclusiveRange(0, 11));
        }
      }
    });

    test('all vertices lie on the unit sphere', () {
      for (final v in ico.vertices) {
        expect((v.length - 1.0).abs(), lessThan(_eps),
            reason: 'vertex $v has length ${v.length}');
      }
    });

    test('all face normals are unit length and outward-pointing', () {
      for (var i = 0; i < ico.faces.length; i++) {
        final n = ico.faceNormals[i];
        expect((n.length - 1.0).abs(), lessThan(_eps));
        // Outward = positive dot product with any vertex of the face.
        final v0 = ico.vertices[ico.faces[i][0]];
        expect(n.dot(v0), greaterThan(0));
      }
    });

    test('has exactly 30 unique undirected edges', () {
      expect(_uniqueEdgeCount(ico.faces), 30);
    });

    test('each vertex is shared by exactly 5 faces', () {
      for (var v = 0; v < 12; v++) {
        final count = ico.faces.where((f) => f.contains(v)).length;
        expect(count, 5, reason: 'vertex $v shared by $count faces');
      }
    });
  });

  group('Dodecahedron', () {
    final dodec = Polyhedron.dodecahedron;

    test('has 20 vertices and 12 pentagonal faces', () {
      expect(dodec.vertices.length, 20);
      expect(dodec.faces.length, 12);
      for (final face in dodec.faces) {
        expect(face.length, 5);
        for (final idx in face) {
          expect(idx, inInclusiveRange(0, 19));
        }
      }
    });

    test('all vertices lie on the unit sphere', () {
      for (final v in dodec.vertices) {
        expect((v.length - 1.0).abs(), lessThan(_eps));
      }
    });

    test('all face normals are unit length and outward-pointing', () {
      for (var i = 0; i < dodec.faces.length; i++) {
        final n = dodec.faceNormals[i];
        expect((n.length - 1.0).abs(), lessThan(_eps));
        final v0 = dodec.vertices[dodec.faces[i][0]];
        expect(n.dot(v0), greaterThan(0));
      }
    });

    test('has exactly 30 unique undirected edges', () {
      expect(_uniqueEdgeCount(dodec.faces), 30);
    });

    test('each vertex is shared by exactly 3 faces', () {
      for (var v = 0; v < 20; v++) {
        final count = dodec.faces.where((f) => f.contains(v)).length;
        expect(count, 3, reason: 'vertex $v shared by $count faces');
      }
    });

    test('each pentagon is planar within tolerance', () {
      // All 5 vertices of a pentagonal face should lie in the same plane
      // (defined by the first three). If the construction is correct, the
      // perpendicular distance of vertices 3 and 4 from that plane is 0.
      for (final face in dodec.faces) {
        final p0 = dodec.vertices[face[0]];
        final p1 = dodec.vertices[face[1]];
        final p2 = dodec.vertices[face[2]];
        final normal = (p1 - p0).cross(p2 - p0).normalized();
        for (var k = 3; k < 5; k++) {
          final dist = (dodec.vertices[face[k]] - p0).dot(normal);
          expect(dist.abs(), lessThan(_eps),
              reason: 'face $face vertex $k out of plane by $dist');
        }
      }
    });
  });

  group('settleRotationFor', () {
    /// Applies `R_x(rx) · R_y(ry)` to `normal`, returning the result.
    Vector3 applyRotation(double rx, double ry, Vector3 normal) {
      // R_y(ry) · v
      final cy = math.cos(ry), sy = math.sin(ry);
      final x1 = normal.x * cy + normal.z * sy;
      final y1 = normal.y;
      final z1 = -normal.x * sy + normal.z * cy;
      // R_x(rx) · result
      final cx = math.cos(rx), sx = math.sin(rx);
      return Vector3(
        x1,
        y1 * cx - z1 * sx,
        y1 * sx + z1 * cx,
      );
    }

    test('maps every icosahedron face normal to (0, 0, 1)', () {
      for (final n in Polyhedron.icosahedron.faceNormals) {
        final (:rx, :ry) = settleRotationFor(n);
        final result = applyRotation(rx, ry, n);
        expect(result.x.abs(), lessThan(_eps));
        expect(result.y.abs(), lessThan(_eps));
        expect((result.z - 1.0).abs(), lessThan(_eps));
      }
    });

    test('maps every dodecahedron face normal to (0, 0, 1)', () {
      for (final n in Polyhedron.dodecahedron.faceNormals) {
        final (:rx, :ry) = settleRotationFor(n);
        final result = applyRotation(rx, ry, n);
        expect(result.x.abs(), lessThan(_eps));
        expect(result.y.abs(), lessThan(_eps));
        expect((result.z - 1.0).abs(), lessThan(_eps));
      }
    });

    test('identity case: normal (0,0,1) returns (0,0)', () {
      final (:rx, :ry) = settleRotationFor(Vector3(0, 0, 1));
      expect(rx.abs(), lessThan(_eps));
      expect(ry.abs(), lessThan(_eps));
    });
  });
}

/// Counts the number of unique undirected edges across all faces.
int _uniqueEdgeCount(List<List<int>> faces) {
  final edges = <String>{};
  for (final face in faces) {
    for (var i = 0; i < face.length; i++) {
      final a = face[i];
      final b = face[(i + 1) % face.length];
      final key = a < b ? '$a-$b' : '$b-$a';
      edges.add(key);
    }
  }
  return edges.length;
}
