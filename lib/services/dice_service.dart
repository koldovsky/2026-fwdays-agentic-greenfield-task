import 'dart:math';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/note.dart';
import '../models/chord_type.dart';
import '../models/dice_result.dart';

part 'dice_service.g.dart';

/// Handles all random dice rolling logic.
///
/// Uses [Random.secure] for cryptographically-seeded randomness, which also
/// ensures each session produces genuinely unpredictable sequences.
class DiceService {
  DiceService({Random? random, DateTime Function()? clock})
      : _random = random ?? _trySecure(),
        _clock = clock ?? DateTime.now;

  final Random _random;
  final DateTime Function() _clock;

  static Random _trySecure() {
    try {
      return Random.secure();
    } catch (_) {
      // Fallback for test environments that don't support secure random.
      return Random();
    }
  }

  /// Rolls a D12: returns a random [Note].
  Note rollD12() => Note.values[_random.nextInt(Note.values.length)];

  /// Rolls a D20: returns a random [ChordType] from [activePool], or from
  /// [kDefaultChordSelection] if [activePool] is null or empty.
  ///
  /// Sampling is uniform across whatever pool is supplied — the die's visual
  /// face-repeat logic is independent of this and lives in
  /// [ChordSelection.faceChordTypes].
  ChordType rollD20({List<ChordType>? activePool}) {
    final pool = (activePool == null || activePool.isEmpty)
        ? kDefaultChordSelection
        : activePool;
    return pool[_random.nextInt(pool.length)];
  }

  /// Rolls both dice simultaneously and returns the combined [DiceResult].
  DiceResult rollBoth({List<ChordType>? activePool}) => DiceResult(
        note: rollD12(),
        chordType: rollD20(activePool: activePool),
        rolledAt: _clock(),
      );

  /// Returns a random [Note] biased toward [lastNote]'s circle-of-fifths
  /// neighbors (+7 and +5 semitones). Each neighbor gets ~2× the weight of
  /// other notes via a 14-slot pool (12 notes + 2 neighbors appended again).
  ///
  /// If [lastNote] is null (first roll), falls back to uniform [rollD12].
  Note rollD12Biased(Note? lastNote) {
    if (lastNote == null) return rollD12();
    final pool = [...Note.values, ...lastNote.fifthNeighbors];
    return pool[_random.nextInt(pool.length)];
  }

  /// Rolls both dice: note biased toward [lastNote]'s fifth neighbors,
  /// chord type uniform over [activePool] (or [kDefaultChordSelection] if
  /// null/empty).
  DiceResult rollBothBiased(Note? lastNote, {List<ChordType>? activePool}) =>
      DiceResult(
        note: rollD12Biased(lastNote),
        chordType: rollD20(activePool: activePool),
        rolledAt: _clock(),
      );
}

@Riverpod(keepAlive: true)
DiceService diceService(Ref ref) => DiceService();
