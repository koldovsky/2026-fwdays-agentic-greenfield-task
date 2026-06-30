import 'dart:async';

import 'package:flutter_midi_pro/flutter_midi_pro.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../constants.dart';
import '../models/arpeggio_pattern.dart';
import '../models/chord.dart';
import '../utils/midi_util.dart';

part 'audio_service.g.dart';

/// Plays chord and single-note audio using flutter_midi_pro + the Salamander
/// Grand Piano SF2 soundfont. FluidSynth (inside flutter_midi_pro) handles
/// all sample playback, velocity layering, and release tails internally.
///
/// ─── Init Strategy ──────────────────────────────────────────────────────────
///   [init] is called lazily on the first [playChord] / [playSingleNote]
///   invocation. Satisfies iOS's requirement that audio engines start only
///   after a user gesture. [loadSoundfontAsset] handles copying the SF2
///   from the app bundle to a temporary directory internally.
///
/// ─── Note Tracking ──────────────────────────────────────────────────────────
///   Active notes are tracked as a `Set<int>` of MIDI note numbers.
///   [stopAll] calls noteOff on all active notes, which triggers the SF2's
///   own release envelope rather than a hard cut.
///
/// ─── Arpeggio Stagger ───────────────────────────────────────────────────────
///   Each chord tone is triggered 30 ms after the previous one (subtle strum).
///
/// ─── Hold / Release ─────────────────────────────────────────────────────────
///   Chord notes: noteOff scheduled 4 s after the last note triggers.
///   Single notes: noteOff scheduled 2 s after trigger.
///   The SF2's release envelope (long natural tail) plays after noteOff.
class AudioService {
  final _midi = MidiPro();
  int? _sfId;
  bool _initialized = false;
  Completer<void>? _initCompleter;
  int _playGeneration = 0;
  Timer? _releaseTimer;
  final Set<int> _activeNotes = {};

  static const _channel = 0;
  static const _velocity = 100; // out of 127 — strong, bright attack
  static const _chordHold = Duration(seconds: 4);
  static const _singleNoteHold = Duration(seconds: 2);
  static const _stagger = Duration(milliseconds: 30);
  static const _sf2Asset = 'assets/audio/salamander_grand.sf2';

  // ─── Public API ─────────────────────────────────────────────────────────────

  /// Initializes flutter_midi_pro and loads the Salamander Grand Piano SF2.
  ///
  /// Safe to call multiple times — subsequent calls are no-ops. Concurrent
  /// callers await the same in-flight [Completer] future.
  /// [loadSoundfontAsset] copies the asset to a temp directory automatically.
  Future<void> init() async {
    if (_initialized) return;
    if (_initCompleter != null) return _initCompleter!.future;

    _initCompleter = Completer<void>();
    try {
      _sfId = await _midi.loadSoundfontAsset(
        assetPath: _sf2Asset,
        bank: 0,
        program: 0,
      );
      await _midi.selectInstrument(
        sfId: _sfId!,
        channel: _channel,
        bank: 0,
        program: 0, // Acoustic Grand Piano (General MIDI program 0)
      );
      _initialized = true;
      _initCompleter!.complete();
    } catch (_) {
      // _initialized stays false — next call retries.
      _initCompleter!.complete(); // complete normally so awaiters don't throw
      _initCompleter = null; // allow retry on next call
    }
  }

  /// Synthesizes and plays all notes of [chord], staggered by 30 ms per note.
  ///
  /// Calls [init] lazily. Stops any currently playing notes before starting.
  Future<void> playChord(Chord chord) async {
    await init();
    if (!_initialized) return;
    await stopAll();

    final gen = ++_playGeneration;
    final notes = chord.chordNotesWithOctave;
    for (final note in notes) {
      if (_playGeneration != gen) break;
      final key = noteToMidi(note.$1, note.$2);
      try {
        unawaited(_midi.playNote(
          sfId: _sfId!,
          channel: _channel,
          key: key,
          velocity: _velocity,
        ));
        _activeNotes.add(key);
      } on Object catch (_) {
        // Non-critical — skip this note.
      }
      await Future<void>.delayed(_stagger);
    }

    if (_playGeneration == gen) {
      _releaseTimer?.cancel();
      _releaseTimer = Timer(_chordHold, _releaseAll);
    }
  }

  /// Plays all notes of [chord] sequentially using [pattern], repeated
  /// [kArpCycles] times.
  ///
  /// Calls [init] lazily and stops any currently playing notes before starting.
  /// Uses the same [_playGeneration] cancellation contract as [playChord] — a
  /// concurrent [stopAll] or new play call will abort the in-flight loop.
  Future<void> playArpeggio(Chord chord, ArpeggioPattern pattern) async {
    await init();
    if (!_initialized) return;
    await stopAll();

    final gen = ++_playGeneration;
    final notes = chord.chordNotesWithOctave;
    final oneCycle = pattern.sequence(notes);
    final fullSequence = [
      for (var i = 0; i < kArpCycles; i++) ...oneCycle,
    ];

    for (final note in fullSequence) {
      if (_playGeneration != gen) break;
      final key = noteToMidi(note.$1, note.$2);
      try {
        unawaited(_midi.playNote(
          sfId: _sfId!,
          channel: _channel,
          key: key,
          velocity: _velocity,
        ));
        _activeNotes.add(key);
      } on Object catch (_) {
        // Non-critical — skip this note.
      }
      await Future<void>.delayed(kArpNoteInterval);
    }

    if (_playGeneration == gen) {
      _releaseTimer?.cancel();
      _releaseTimer = Timer(_chordHold, _releaseAll);
    }
  }

  /// Plays a single note — used by the piano keyboard widget.
  Future<void> playSingleNote(String noteName, int octave) async {
    await init();
    if (!_initialized) return;

    final key = noteToMidi(noteName, octave);
    try {
      unawaited(_midi.playNote(
        sfId: _sfId!,
        channel: _channel,
        key: key,
        velocity: _velocity,
      ));
      _activeNotes.add(key);
    } on Object catch (_) {
      return;
    }

    unawaited(Future<void>.delayed(_singleNoteHold, () {
      if (_activeNotes.contains(key)) {
        _activeNotes.remove(key);
        _stopNote(key);
      }
    }));
  }

  /// Stops all currently playing notes immediately (triggers SF2 release phase).
  Future<void> stopAll() async {
    if (!_initialized) return;
    _playGeneration++; // invalidates any in-flight playChord stagger loop
    _releaseAll();
  }

  /// Releases the audio engine. Call in widget dispose / app lifecycle.
  void dispose() {
    if (!_initialized) return;
    _releaseAll();
    _initialized = false;
    unawaited(_midi.dispose());
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  void _releaseAll() {
    _releaseTimer?.cancel();
    _releaseTimer = null;
    final notes = Set<int>.from(_activeNotes);
    _activeNotes.clear();
    for (final key in notes) {
      _stopNote(key);
    }
  }

  void _stopNote(int key) {
    try {
      unawaited(_midi.stopNote(sfId: _sfId!, channel: _channel, key: key));
    } on Object catch (_) {
      // Note may already be stopped — safe to ignore.
    }
  }
}

@Riverpod(keepAlive: true)
AudioService audioService(Ref ref) {
  final service = AudioService();
  ref.onDispose(service.dispose);
  return service;
}
