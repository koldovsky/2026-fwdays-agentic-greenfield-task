import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../constants.dart';
import '../models/chord.dart';
import '../models/chord_selection.dart';
import '../models/dice_result.dart';
import '../services/dice_service.dart';
import '../services/audio_service.dart';
import 'arpeggio_provider.dart';
import 'chord_selection_provider.dart';
import 'theme_provider.dart';

part 'dice_provider.g.dart';

// ─── Prefs Keys ───────────────────────────────────────────────────────────────

const _kHistory = 'dice_history';

// ─── Roll State Enum ──────────────────────────────────────────────────────────

enum RollState { idle, rolling, result }

// ─── Immutable State ──────────────────────────────────────────────────────────

class DiceState {
  const DiceState({
    this.rollState = RollState.idle,
    this.current,
    this.rollingTarget,
    this.history = const [],
    this.chordFaceIndex = 0,
  });

  final RollState rollState;

  /// The most recent *settled* roll result. Null before the first roll.
  /// [ChordInfoCard] and [HistoryStrip] read this.
  final DiceResult? current;

  /// The upcoming roll result during the rolling phase. Set as soon as
  /// `DiceNotifier.beginRoll()` rolls the dice (synchronously, before
  /// the animation) so [Dice3D] can compute its settle rotation at the
  /// start of the animation and land exactly on the correct face.
  /// Cleared on settle.
  final DiceResult? rollingTarget;

  /// Roll history, newest first. Capped at [maxHistory] entries.
  /// Stored as full [DiceResult]s (not just [Chord]s) so the
  /// `rolledAt` timestamp is preserved for future features.
  final List<DiceResult> history;

  /// The 0–19 face index of the D20 chord die for the current (or rolling)
  /// chord, resolved against the user's [ChordSelection.faceChordTypes].
  ///
  /// When the active selection has fewer than 20 entries, multiple faces map
  /// to the same chord; [DiceNotifier] picks one randomly at roll time for
  /// visual variety. On [replayFromHistory] and when the selection changes
  /// post-settle, the first matching face is used for determinism.
  final int chordFaceIndex;

  static const maxHistory = 16;

  DiceState copyWith({
    RollState? rollState,
    DiceResult? current,
    DiceResult? rollingTarget,
    bool clearRollingTarget = false,
    bool clearCurrent = false,
    List<DiceResult>? history,
    int? chordFaceIndex,
  }) {
    return DiceState(
      rollState: rollState ?? this.rollState,
      current: clearCurrent ? null : (current ?? this.current),
      rollingTarget:
          clearRollingTarget ? null : (rollingTarget ?? this.rollingTarget),
      history: history ?? this.history,
      chordFaceIndex: chordFaceIndex ?? this.chordFaceIndex,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DiceState &&
          other.rollState == rollState &&
          other.current == current &&
          other.rollingTarget == rollingTarget &&
          other.chordFaceIndex == chordFaceIndex &&
          _diceStateListEquals(other.history, history);

  @override
  int get hashCode => Object.hash(
        rollState,
        current,
        rollingTarget,
        chordFaceIndex,
        Object.hashAll(history),
      );
}

bool _diceStateListEquals(List<DiceResult> a, List<DiceResult> b) {
  if (identical(a, b)) return true;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

// ─── Notifier ─────────────────────────────────────────────────────────────────

@Riverpod(keepAlive: true)
class DiceNotifier extends _$DiceNotifier {
  late DiceService _dice;
  late AudioService _audio;
  Timer? _watchdog;
  final math.Random _faceRng = math.Random();

  @override
  DiceState build() {
    _dice = ref.watch(diceServiceProvider);
    _audio = ref.watch(audioServiceProvider);

    // When the active chord selection changes mid-session, re-resolve the
    // current chord's face index so the die doesn't visually point at a
    // stale face. Uses first-match for determinism (no randomization
    // outside of an actual roll).
    ref.listen<ChordSelection>(chordSelectionProvider, (prev, next) {
      final current = state.current;
      if (current == null) return;
      final newIndex = next.firstFaceFor(current.chordType);
      if (newIndex != state.chordFaceIndex) {
        state = state.copyWith(chordFaceIndex: newIndex);
      }
    });

    ref.onDispose(() {
      _watchdog?.cancel();
      _watchdog = null;
    });
    Future.microtask(_loadHistoryAsync);
    return const DiceState();
  }

  /// Loads persisted roll history from [SharedPreferencesAsync].
  ///
  /// The outer try-catch handles corrupt JSON; the inner try-catch skips
  /// individual entries with unrecognized enum names (forward-compat with
  /// future renames). Hydrates state only if history is still empty (guards
  /// against a race with an immediate roll).
  Future<void> _loadHistoryAsync() async {
    if (!ref.mounted) return;
    final prefs = ref.read(sharedPreferencesProvider);
    final raw = await prefs.getString(_kHistory);
    if (!ref.mounted) return;
    if (raw == null) return;
    try {
      final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
      final results = <DiceResult>[];
      for (final item in list) {
        try {
          results.add(DiceResult.fromJson(item));
        } catch (_) {
          // Skip entries with unknown enum names or missing fields.
        }
      }
      if (!ref.mounted) return;
      if (state.history.isEmpty && results.isNotEmpty) {
        // Resolve the die face for the hydrated current chord against the
        // active selection at hydration time.
        // snapshot at fire-time, not a subscription
        final selection = ref.read(chordSelectionProvider);
        final faceIdx = selection.firstFaceFor(results.first.chordType);
        state = state.copyWith(
          history: results,
          current: results.first,
          chordFaceIndex: faceIdx,
        );
      }
    } catch (_) {
      // Corrupt JSON — stay with empty history.
    }
  }

  /// Persists the current history list to [SharedPreferencesAsync].
  Future<void> _persistHistory() async {
    final json = jsonEncode(state.history.map((r) => r.toJson()).toList());
    await ref.read(sharedPreferencesProvider).setString(_kHistory, json);
  }

  /// Begins a new dice roll. Synchronously publishes the result via
  /// [DiceState.rollingTarget] and flips [DiceState.rollState] to
  /// [RollState.rolling] so [DiceStage] can start its tumble animation
  /// on the correct target face at the very first frame.
  ///
  /// Chord sampling is restricted to the user's active chord selection
  /// from `chordSelectionProvider`. The landing die face is picked randomly
  /// among all face indices that resolve to the rolled chord (relevant when
  /// the active set is smaller than 20 and faces repeat).
  ///
  /// Completion is driven by [settleRoll], called either by
  /// [DiceStage]'s `onSettled` callback when the tumble finishes, or
  /// by an internal watchdog ([kRollAnimationDuration] +
  /// [kRollWatchdogGrace]) as a safety net in case the stage is
  /// unmounted mid-roll and never fires its callback.
  void beginRoll() {
    if (!ref.mounted) return;
    if (state.rollState == RollState.rolling) return;

    // snapshot at fire-time, not a subscription
    final selection = ref.read(chordSelectionProvider);
    final result = _dice.rollBothBiased(
      state.current?.note,
      activePool: selection.active,
    );

    final candidates = selection.facesFor(result.chordType);
    final faceIdx = candidates.isEmpty
        ? 0
        : candidates[_faceRng.nextInt(candidates.length)];

    state = state.copyWith(
      rollState: RollState.rolling,
      rollingTarget: result,
      chordFaceIndex: faceIdx,
    );

    // Pre-load SF2 soundfont in parallel with the roll animation.
    // On first roll: starts the load. On subsequent rolls: no-op.
    unawaited(_audio.init());

    _watchdog?.cancel();
    _watchdog = Timer(kRollAnimationDuration + kRollWatchdogGrace, () {
      if (ref.mounted && state.rollState == RollState.rolling) {
        settleRoll();
      }
    });
  }

  /// Finalizes the current roll: moves [rollingTarget] into [current],
  /// prepends to history, and plays the chord audio. Idempotent — a
  /// second call during [RollState.result] is a no-op, which means
  /// the stage callback and the watchdog can both safely fire.
  Future<void> settleRoll() async {
    if (!ref.mounted) return;
    if (state.rollState != RollState.rolling) return;

    _watchdog?.cancel();
    _watchdog = null;

    final target = state.rollingTarget;
    if (target == null) {
      // Defensive: beginRoll always sets rollingTarget before flipping
      // to rolling, so this branch should be unreachable.
      state = state.copyWith(rollState: RollState.result);
      return;
    }

    final newHistory =
        [target, ...state.history].take(DiceState.maxHistory).toList();

    state = state.copyWith(
      rollState: RollState.result,
      current: target,
      clearRollingTarget: true,
      history: newHistory,
    );
    await _persistHistory();

    if (!ref.mounted) return;
    // snapshot at fire-time, not a subscription
    final arpSettings = ref.read(arpeggioProvider);
    if (arpSettings.enabled) {
      await _audio.playArpeggio(target.chord, arpSettings.pattern);
    } else {
      await _audio.playChord(target.chord);
    }
  }

  /// Re-displays a history entry as the current result and replays its audio.
  ///
  /// Updates [DiceState.current] so the chord card, dice faces (via the
  /// indices passed to [DiceStage]), and piano keyboard all snap to the
  /// replayed chord without triggering a roll animation. Gated on
  /// [RollState.rolling] so a history tap mid-roll is silently dropped.
  ///
  /// The die's face index snaps to the first face matching the replayed
  /// chord under the current active selection (deterministic, no
  /// randomization).
  Future<void> replayFromHistory(DiceResult result) async {
    if (!ref.mounted) return;
    if (state.rollState == RollState.rolling) return;
    // snapshot at fire-time, not a subscription
    final selection = ref.read(chordSelectionProvider);
    state = state.copyWith(
      current: result,
      rollState: RollState.result,
      clearRollingTarget: true,
      chordFaceIndex: selection.firstFaceFor(result.chordType),
    );
    await _audio.stopAll();
    if (!ref.mounted) return;
    // snapshot at fire-time, not a subscription
    final arpSettings = ref.read(arpeggioProvider);
    if (arpSettings.enabled) {
      await _audio.playArpeggio(result.chord, arpSettings.pattern);
    } else {
      await _audio.playChord(result.chord);
    }
  }

  /// Clears all roll history and resets to idle state.
  ///
  /// No-op if a roll is in progress — gated on [RollState.rolling].
  /// Stops any in-flight audio before resetting state, then removes
  /// the persisted history from [SharedPreferencesAsync].
  Future<void> clearHistory() async {
    if (!ref.mounted) return;
    if (state.rollState == RollState.rolling) return;
    await _audio.stopAll();
    if (!ref.mounted) return;
    state = state.copyWith(
      rollState: RollState.idle,
      clearCurrent: true,
      clearRollingTarget: true,
      history: const [],
      chordFaceIndex: 0,
    );
    await ref.read(sharedPreferencesProvider).remove(_kHistory);
  }

  /// Stops all audio playback.
  Future<void> stopAudio() => _audio.stopAll();
}
