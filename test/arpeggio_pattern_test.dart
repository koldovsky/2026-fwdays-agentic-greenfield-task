import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/arpeggio_pattern.dart';

void main() {
  // Convenience 3-note list used across most tests.
  const three = ['C', 'E', 'G'];
  const two = ['C', 'G'];
  const one = ['C'];

  // ─── displayName ──────────────────────────────────────────────────────────

  group('ArpeggioPatternX.displayName', () {
    test('all 13 patterns have a non-empty displayName', () {
      for (final p in ArpeggioPattern.values) {
        expect(p.displayName, isNotEmpty,
            reason: '${p.name} has no displayName');
      }
    });
  });

  // ─── Edge cases: empty / 1 / 2 notes ─────────────────────────────────────

  group('sequence — edge cases', () {
    test('empty list returns empty for every pattern', () {
      for (final p in ArpeggioPattern.values) {
        expect(p.sequence(<String>[]), isEmpty,
            reason: '${p.name} did not return empty');
      }
    });

    test('1-note list returns [note] for every pattern', () {
      for (final p in ArpeggioPattern.values) {
        expect(p.sequence(one), ['C'],
            reason: '${p.name} did not return single element');
      }
    });

    test('2-note list: no crash for every pattern', () {
      for (final p in ArpeggioPattern.values) {
        expect(() => p.sequence(two), returnsNormally,
            reason: '${p.name} threw on 2-note input');
        expect(p.sequence(two), isNotEmpty,
            reason: '${p.name} returned empty for 2-note input');
      }
    });
  });

  // ─── up ───────────────────────────────────────────────────────────────────

  group('ArpeggioPattern.up', () {
    test('3 notes: ascending order', () {
      expect(ArpeggioPattern.up.sequence(three), ['C', 'E', 'G']);
    });

    test('2 notes: [C, G]', () {
      expect(ArpeggioPattern.up.sequence(two), ['C', 'G']);
    });
  });

  // ─── down ─────────────────────────────────────────────────────────────────

  group('ArpeggioPattern.down', () {
    test('3 notes: descending order', () {
      expect(ArpeggioPattern.down.sequence(three), ['G', 'E', 'C']);
    });

    test('2 notes: [G, C]', () {
      expect(ArpeggioPattern.down.sequence(two), ['G', 'C']);
    });
  });

  // ─── upDown (endpoints NOT repeated) ─────────────────────────────────────

  group('ArpeggioPattern.upDown', () {
    test('3 notes: up then down, top not repeated', () {
      // [C, E, G] → up: [C, E, G]; down without top or bottom: [E]
      // combined: [C, E, G, E]
      expect(ArpeggioPattern.upDown.sequence(three), ['C', 'E', 'G', 'E']);
    });

    test('top note is NOT repeated at junction', () {
      final seq = ArpeggioPattern.upDown.sequence(three);
      // The top note 'G' appears exactly once
      expect(seq.where((n) => n == 'G').length, 1);
    });

    test('2 notes: [C, G] → [C, G]', () {
      // up [C, G], down without top or bottom [] → [C, G]
      expect(ArpeggioPattern.upDown.sequence(two), ['C', 'G']);
    });
  });

  // ─── downUp (endpoints NOT repeated) ─────────────────────────────────────

  group('ArpeggioPattern.downUp', () {
    test('3 notes: down then up, bottom not repeated', () {
      // [C, E, G] → down: [G, E, C]; up without bottom or top: [E]
      // combined: [G, E, C, E]
      expect(ArpeggioPattern.downUp.sequence(three), ['G', 'E', 'C', 'E']);
    });

    test('bottom note is NOT repeated at junction', () {
      final seq = ArpeggioPattern.downUp.sequence(three);
      expect(seq.where((n) => n == 'C').length, 1);
    });
  });

  // ─── upAndDown (endpoints ARE repeated) ──────────────────────────────────

  group('ArpeggioPattern.upAndDown', () {
    test('3 notes: up then full down, top repeated', () {
      // [C, E, G] → [C, E, G, G, E, C]
      expect(ArpeggioPattern.upAndDown.sequence(three),
          ['C', 'E', 'G', 'G', 'E', 'C']);
    });

    test('top note IS repeated at junction', () {
      final seq = ArpeggioPattern.upAndDown.sequence(three);
      expect(seq.where((n) => n == 'G').length, 2);
    });

    test('bottom note IS repeated (first and last)', () {
      final seq = ArpeggioPattern.upAndDown.sequence(three);
      expect(seq.first, 'C');
      expect(seq.last, 'C');
    });
  });

  // ─── downAndUp (endpoints ARE repeated) ──────────────────────────────────

  group('ArpeggioPattern.downAndUp', () {
    test('3 notes: down then full up, bottom repeated', () {
      // [C, E, G] → [G, E, C, C, E, G]
      expect(ArpeggioPattern.downAndUp.sequence(three),
          ['G', 'E', 'C', 'C', 'E', 'G']);
    });

    test('bottom note IS repeated at junction', () {
      final seq = ArpeggioPattern.downAndUp.sequence(three);
      expect(seq.where((n) => n == 'C').length, 2);
    });

    test('top note IS repeated (first and last)', () {
      final seq = ArpeggioPattern.downAndUp.sequence(three);
      expect(seq.first, 'G');
      expect(seq.last, 'G');
    });
  });

  // ─── converge ────────────────────────────────────────────────────────────

  group('ArpeggioPattern.converge', () {
    test('3 notes: outer-in, low-first', () {
      // lo=C hi=G → [C, G], then lo=E hi=E → [E]; result: [C, G, E]
      expect(ArpeggioPattern.converge.sequence(three), ['C', 'G', 'E']);
    });

    test('4 notes: [C, E, G, B] → [C, B, E, G]', () {
      expect(ArpeggioPattern.converge.sequence(['C', 'E', 'G', 'B']),
          ['C', 'B', 'E', 'G']);
    });

    test('2 notes: [C, G] → [C, G]', () {
      expect(ArpeggioPattern.converge.sequence(two), ['C', 'G']);
    });

    test('returns same length as input', () {
      expect(ArpeggioPattern.converge.sequence(three).length, three.length);
    });
  });

  // ─── diverge ─────────────────────────────────────────────────────────────

  group('ArpeggioPattern.diverge', () {
    test('3 notes: inner-out, right-first', () {
      // mid=1, leftHalf=[C] reversed=[C], rightHalf=[E,G]
      // i=0: right[0]=E, left[0]=C → [E, C]; i=1: right[1]=G → [G]
      // result: [E, C, G]
      expect(ArpeggioPattern.diverge.sequence(three), ['E', 'C', 'G']);
    });

    test('4 notes: [C, E, G, B] → [E, G, C, B] (inner pair then outer)', () {
      // mid=2, leftHalf=[C,E] reversed=[E,C], rightHalf=[G,B]
      // i=0: G, E; i=1: B, C → [G, E, B, C]
      expect(ArpeggioPattern.diverge.sequence(['C', 'E', 'G', 'B']),
          ['G', 'E', 'B', 'C']);
    });

    test('returns same length as input', () {
      expect(ArpeggioPattern.diverge.sequence(three).length, three.length);
    });
  });

  // ─── conAndDiverge ───────────────────────────────────────────────────────

  group('ArpeggioPattern.conAndDiverge', () {
    test('no crash on 3 notes', () {
      expect(
          () => ArpeggioPattern.conAndDiverge.sequence(three), returnsNormally);
    });

    test('contains all notes at least once', () {
      final seq = ArpeggioPattern.conAndDiverge.sequence(three);
      for (final n in three) {
        expect(seq, contains(n),
            reason: '$n missing from conAndDiverge output');
      }
    });

    test('4 notes: no crash, contains all notes', () {
      final input = ['C', 'E', 'G', 'B'];
      final seq = ArpeggioPattern.conAndDiverge.sequence(input);
      for (final n in input) {
        expect(seq, contains(n));
      }
    });
  });

  // ─── pinkyUp ─────────────────────────────────────────────────────────────

  group('ArpeggioPattern.pinkyUp', () {
    test('3 notes: highest first then full ascending sweep', () {
      // [G, C, E, G]
      expect(ArpeggioPattern.pinkyUp.sequence(three), ['G', 'C', 'E', 'G']);
    });

    test('first element is the highest note', () {
      final seq = ArpeggioPattern.pinkyUp.sequence(three);
      expect(seq.first, three.last);
    });

    test('2 notes: [G, C, G]', () {
      expect(ArpeggioPattern.pinkyUp.sequence(two), ['G', 'C', 'G']);
    });
  });

  // ─── pinkyUpDown ─────────────────────────────────────────────────────────

  group('ArpeggioPattern.pinkyUpDown', () {
    test('3 notes: highest, up from bottom, then down without endpoints', () {
      // [G, C, E, G, E, C]   — top note is the initial anchor + appears again
      //                         at the peak of the sweep; bottom C appears
      //                         at the end of the down sweep
      expect(ArpeggioPattern.pinkyUpDown.sequence(three),
          ['G', 'C', 'E', 'G', 'E', 'C']);
    });

    test('no crash on 2 notes', () {
      expect(() => ArpeggioPattern.pinkyUpDown.sequence(two), returnsNormally);
    });
  });

  // ─── thumbUp ─────────────────────────────────────────────────────────────

  group('ArpeggioPattern.thumbUp', () {
    test('3 notes: full ascending then lowest again', () {
      // [C, E, G, C]
      expect(ArpeggioPattern.thumbUp.sequence(three), ['C', 'E', 'G', 'C']);
    });

    test('last element is the lowest note', () {
      final seq = ArpeggioPattern.thumbUp.sequence(three);
      expect(seq.last, three.first);
    });

    test('2 notes: [C, G, C]', () {
      expect(ArpeggioPattern.thumbUp.sequence(two), ['C', 'G', 'C']);
    });
  });

  // ─── thumbUpDown ─────────────────────────────────────────────────────────

  group('ArpeggioPattern.thumbUpDown', () {
    test('3 notes: lowest, up from second, then down without endpoints', () {
      // [C, E, G, E, C]
      expect(ArpeggioPattern.thumbUpDown.sequence(three),
          ['C', 'E', 'G', 'E', 'C']);
    });

    test('first element is the lowest note', () {
      final seq = ArpeggioPattern.thumbUpDown.sequence(three);
      expect(seq.first, three.first);
    });

    test('2 notes: no crash', () {
      expect(() => ArpeggioPattern.thumbUpDown.sequence(two), returnsNormally);
    });
  });

  // ─── Generic type preservation ───────────────────────────────────────────

  group('sequence<T> — generic type preservation', () {
    test('works with int lists', () {
      final seq = ArpeggioPattern.up.sequence([1, 3, 5]);
      expect(seq, [1, 3, 5]);
      expect(seq, isA<List<int>>());
    });

    test('works with record-like maps (int keys)', () {
      final seq = ArpeggioPattern.down.sequence([60, 64, 67]);
      expect(seq, [67, 64, 60]);
    });
  });
}
