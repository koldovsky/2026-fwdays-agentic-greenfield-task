import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../constants.dart';
import '../models/chord.dart';
import '../utils/midi_util.dart';

/// Generates a MIDI Type 0 file from a list of [Chord]s and writes it to the
/// app's temporary directory.
///
/// ─── MIDI Structure ─────────────────────────────────────────────────────────
///   Type 0 (single track), 480 ticks per beat (PPQ), 120 BPM.
///   Each chord is a block: simultaneous NoteOn events at delta 0, followed by
///   simultaneous NoteOff events after 4 beats (one whole note = 1920 ticks).
///
/// ─── Encoding ───────────────────────────────────────────────────────────────
///   All multi-byte integers are big-endian (MIDI spec).
///   Delta times are encoded as variable-length quantities (VLQ).
class MidiExportService {
  static const _ticksPerBeat = 480;
  static const _beatsPerChord = 4; // whole note
  static const _ticksPerChord = _ticksPerBeat * _beatsPerChord; // 1920
  static const _channel = 0; // MIDI channel 0 (GM channel 1)
  static const _outputFilename = 'chord_dice_export.mid';

  /// Generates a MIDI Type 0 file from [chords] (oldest first / chronological)
  /// and writes it to the app temp directory.
  ///
  /// Returns the absolute file path on success.
  /// Throws [FileSystemException] on file-system errors, or [StateError] on
  /// encoding errors.
  Future<String> exportToFile(List<Chord> chords) async {
    final bytes = _buildMidiBytes(chords);
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$_outputFilename');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  /// Exposed for testing — builds the raw MIDI bytes without writing to disk.
  @visibleForTesting
  Uint8List buildMidiBytesForTest(List<Chord> chords) =>
      _buildMidiBytes(chords);

  // ─── MIDI Byte Construction ──────────────────────────────────────────────────

  Uint8List _buildMidiBytes(List<Chord> chords) {
    final track = _buildTrackBytes(chords);
    final buf = BytesBuilder();

    // ── Header chunk ──
    buf.add(_ascii('MThd'));
    buf.add(_uint32(6)); // header length always 6
    buf.add(_uint16(0)); // format: Type 0
    buf.add(_uint16(1)); // number of tracks
    buf.add(_uint16(_ticksPerBeat)); // ticks per quarter note

    // ── Track chunk ──
    buf.add(_ascii('MTrk'));
    buf.add(_uint32(track.length));
    buf.add(track);

    return buf.toBytes();
  }

  Uint8List _buildTrackBytes(List<Chord> chords) {
    final buf = BytesBuilder();

    // Set tempo: FF 51 03 tt tt tt (microseconds per beat)
    final usPerBeat = 60000000 ~/ kMidiExportBpm; // 500000 for 120 BPM
    buf.add(_vlq(0)); // delta time 0
    buf.add([0xFF, 0x51, 0x03]);
    buf.add(_uint24(usPerBeat));

    for (final chord in chords) {
      final notes = chord.chordNotesWithOctave
          .map((n) => noteToMidi(n.$1, n.$2))
          .toList();

      // NoteOn events — all at delta 0 (simultaneous)
      for (var i = 0; i < notes.length; i++) {
        buf.add(_vlq(0));
        buf.add([0x90 | _channel, notes[i], kMidiExportVelocity]);
      }

      // NoteOff events — first at delta _ticksPerChord, rest at delta 0
      for (var i = 0; i < notes.length; i++) {
        buf.add(_vlq(i == 0 ? _ticksPerChord : 0));
        buf.add([0x80 | _channel, notes[i], 0]);
      }
    }

    // End of track: FF 2F 00
    buf.add(_vlq(0));
    buf.add([0xFF, 0x2F, 0x00]);

    return buf.toBytes();
  }

  // ─── Encoding Helpers ────────────────────────────────────────────────────────

  /// Encodes [value] as a 4-byte big-endian unsigned integer.
  List<int> _uint32(int value) => [
        (value >> 24) & 0xFF,
        (value >> 16) & 0xFF,
        (value >> 8) & 0xFF,
        value & 0xFF,
      ];

  /// Encodes [value] as a 2-byte big-endian unsigned integer.
  List<int> _uint16(int value) => [
        (value >> 8) & 0xFF,
        value & 0xFF,
      ];

  /// Encodes [value] as a 3-byte big-endian unsigned integer (used for tempo).
  List<int> _uint24(int value) => [
        (value >> 16) & 0xFF,
        (value >> 8) & 0xFF,
        value & 0xFF,
      ];

  /// Encodes [value] as a MIDI variable-length quantity (VLQ).
  ///
  /// VLQ uses 7 bits per byte; the MSB of each byte is 1 except for the last.
  List<int> _vlq(int value) {
    assert(value >= 0, 'VLQ value must be non-negative');
    if (value == 0) return [0x00];
    final bytes = <int>[];
    var v = value;
    while (v > 0) {
      bytes.insert(0, v & 0x7F);
      v >>= 7;
    }
    for (var i = 0; i < bytes.length - 1; i++) {
      bytes[i] |= 0x80;
    }
    return bytes;
  }

  /// Returns the ASCII byte values for [s].
  List<int> _ascii(String s) => s.codeUnits;
}
