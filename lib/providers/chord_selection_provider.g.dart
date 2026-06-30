// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chord_selection_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Manages the user's active chord-type selection (3 – 20 chords) and
/// persists every change to [SharedPreferencesAsync] as a JSON array of
/// enum-name strings.
///
/// [build] returns [kDefaultChordSelection] synchronously then schedules a
/// [_load] via [Future.microtask] to hydrate persisted selection. At most one
/// frame of default state is shown before the user's saved selection appears.
///
/// ## Defensive decoding
///
/// On load, the saved JSON is filtered to keep only known [ChordType] names
/// (forward-compat with future chord renames) then clamped to
/// `[ChordSelection.minCount, ChordSelection.maxCount]`. If the surviving list
/// is too short, the default selection is restored and re-persisted.

@ProviderFor(ChordSelectionNotifier)
final chordSelectionProvider = ChordSelectionNotifierProvider._();

/// Manages the user's active chord-type selection (3 – 20 chords) and
/// persists every change to [SharedPreferencesAsync] as a JSON array of
/// enum-name strings.
///
/// [build] returns [kDefaultChordSelection] synchronously then schedules a
/// [_load] via [Future.microtask] to hydrate persisted selection. At most one
/// frame of default state is shown before the user's saved selection appears.
///
/// ## Defensive decoding
///
/// On load, the saved JSON is filtered to keep only known [ChordType] names
/// (forward-compat with future chord renames) then clamped to
/// `[ChordSelection.minCount, ChordSelection.maxCount]`. If the surviving list
/// is too short, the default selection is restored and re-persisted.
final class ChordSelectionNotifierProvider
    extends $NotifierProvider<ChordSelectionNotifier, ChordSelection> {
  /// Manages the user's active chord-type selection (3 – 20 chords) and
  /// persists every change to [SharedPreferencesAsync] as a JSON array of
  /// enum-name strings.
  ///
  /// [build] returns [kDefaultChordSelection] synchronously then schedules a
  /// [_load] via [Future.microtask] to hydrate persisted selection. At most one
  /// frame of default state is shown before the user's saved selection appears.
  ///
  /// ## Defensive decoding
  ///
  /// On load, the saved JSON is filtered to keep only known [ChordType] names
  /// (forward-compat with future chord renames) then clamped to
  /// `[ChordSelection.minCount, ChordSelection.maxCount]`. If the surviving list
  /// is too short, the default selection is restored and re-persisted.
  ChordSelectionNotifierProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'chordSelectionProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$chordSelectionNotifierHash();

  @$internal
  @override
  ChordSelectionNotifier create() => ChordSelectionNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ChordSelection value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ChordSelection>(value),
    );
  }
}

String _$chordSelectionNotifierHash() =>
    r'8c68f44c5e1f13062400d33eab3ca7e2cd06a4e6';

/// Manages the user's active chord-type selection (3 – 20 chords) and
/// persists every change to [SharedPreferencesAsync] as a JSON array of
/// enum-name strings.
///
/// [build] returns [kDefaultChordSelection] synchronously then schedules a
/// [_load] via [Future.microtask] to hydrate persisted selection. At most one
/// frame of default state is shown before the user's saved selection appears.
///
/// ## Defensive decoding
///
/// On load, the saved JSON is filtered to keep only known [ChordType] names
/// (forward-compat with future chord renames) then clamped to
/// `[ChordSelection.minCount, ChordSelection.maxCount]`. If the surviving list
/// is too short, the default selection is restored and re-persisted.

abstract class _$ChordSelectionNotifier extends $Notifier<ChordSelection> {
  ChordSelection build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ChordSelection, ChordSelection>;
    final element = ref.element as $ClassProviderElement<
        AnyNotifier<ChordSelection, ChordSelection>,
        ChordSelection,
        Object?,
        Object?>;
    return element.handleCreate(ref, build);
  }
}
