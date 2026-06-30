// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'arpeggio_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Manages [ArpeggioSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs.

@ProviderFor(ArpeggioNotifier)
final arpeggioProvider = ArpeggioNotifierProvider._();

/// Manages [ArpeggioSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs.
final class ArpeggioNotifierProvider
    extends $NotifierProvider<ArpeggioNotifier, ArpeggioSettings> {
  /// Manages [ArpeggioSettings] state and persists every change to
  /// [SharedPreferencesAsync].
  ///
  /// [build] returns the default state synchronously and schedules an async
  /// [_load] via [Future.microtask] to hydrate from persisted prefs.
  ArpeggioNotifierProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'arpeggioProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$arpeggioNotifierHash();

  @$internal
  @override
  ArpeggioNotifier create() => ArpeggioNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ArpeggioSettings value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ArpeggioSettings>(value),
    );
  }
}

String _$arpeggioNotifierHash() => r'36eac1eb8cb832e16ab83b585d54b3c014d5305d';

/// Manages [ArpeggioSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs.

abstract class _$ArpeggioNotifier extends $Notifier<ArpeggioSettings> {
  ArpeggioSettings build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ArpeggioSettings, ArpeggioSettings>;
    final element = ref.element as $ClassProviderElement<
        AnyNotifier<ArpeggioSettings, ArpeggioSettings>,
        ArpeggioSettings,
        Object?,
        Object?>;
    return element.handleCreate(ref, build);
  }
}
