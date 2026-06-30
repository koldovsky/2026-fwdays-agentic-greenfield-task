import 'package:flutter_test/flutter_test.dart';

import 'package:chord_dice/models/chord.dart';
import 'package:chord_dice/models/chord_type.dart';
import 'package:chord_dice/models/note.dart';
import 'package:chord_dice/services/midi_export_service.dart';

void main() {
  // ─── Helpers ─────────────────────────────────────────────────────────────────

  final service = MidiExportService();

  Chord makeChord(Note root, ChordType type) => Chord(root: root, type: type);

  // ─── MIDI header validation ───────────────────────────────────────────────────

  group('MidiExportService byte structure', () {
    test('output starts with MThd header', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // Bytes 0-3: "MThd"
      expect(bytes.sublist(0, 4), [0x4D, 0x54, 0x68, 0x64]);
    });

    test('header length field is 6', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // Bytes 4-7: big-endian 6
      expect(bytes.sublist(4, 8), [0x00, 0x00, 0x00, 0x06]);
    });

    test('format is Type 0', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // Bytes 8-9: format word = 0
      expect(bytes.sublist(8, 10), [0x00, 0x00]);
    });

    test('track count is 1', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // Bytes 10-11: num tracks = 1
      expect(bytes.sublist(10, 12), [0x00, 0x01]);
    });

    test('ticks per beat is 480', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // Bytes 12-13: PPQ = 480 = 0x01E0
      expect(bytes.sublist(12, 14), [0x01, 0xE0]);
    });

    test('track chunk starts with MTrk', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // Bytes 14-17: "MTrk"
      expect(bytes.sublist(14, 18), [0x4D, 0x54, 0x72, 0x6B]);
    });
  });

  // ─── Content tests ────────────────────────────────────────────────────────────

  group('MidiExportService content', () {
    test('single-chord export produces non-empty output', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      expect(bytes.length, greaterThan(0));
    });

    test('multi-chord export is larger than single-chord export', () {
      final single =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      final multi = service.buildMidiBytesForTest([
        makeChord(Note.c, ChordType.major),
        makeChord(Note.a, ChordType.minor),
        makeChord(Note.f, ChordType.major),
      ]);
      expect(multi.length, greaterThan(single.length));
    });

    test('two different chord lists produce different byte lengths', () {
      // Major triad = 3 notes; major 7th = 4 notes — different event counts
      final triad =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      final seventh =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.maj7)]);
      expect(seventh.length, isNot(equals(triad.length)));
    });

    test('empty chord list produces minimal valid MIDI (header + empty track)',
        () {
      final bytes = service.buildMidiBytesForTest([]);
      // Header (14 bytes) + MTrk (4) + track length (4) + tempo event (7)
      // + end-of-track (3) = 32 bytes minimum
      expect(bytes.length, greaterThanOrEqualTo(32));
      // Still starts with MThd
      expect(bytes.sublist(0, 4), [0x4D, 0x54, 0x68, 0x64]);
    });
  });

  // ─── noteToMidi spot-check via chord output ───────────────────────────────────

  group('NoteOn events contain expected MIDI note numbers', () {
    test('C Major triad NoteOn bytes appear in track data', () {
      final bytes =
          service.buildMidiBytesForTest([makeChord(Note.c, ChordType.major)]);
      // C3=48, E3=52, G3=55 — NoteOn channel 0 = 0x90
      // Search track data (after 22-byte header+MTrk+len) for 0x90 kk vel
      final trackData = bytes.sublist(22);
      final noteOns = <int>[];
      for (var i = 0; i < trackData.length - 2; i++) {
        if (trackData[i] == 0x90) {
          noteOns.add(trackData[i + 1]);
        }
      }
      expect(noteOns, containsAll([48, 52, 55])); // C3, E3, G3
    });
  });
}
