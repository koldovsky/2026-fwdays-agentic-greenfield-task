// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'theme_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Manages [ThemeSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs. At most
/// one frame of default state is shown before the saved theme swaps in.

@ProviderFor(ThemeNotifier)
final themeProvider = ThemeNotifierProvider._();

/// Manages [ThemeSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs. At most
/// one frame of default state is shown before the saved theme swaps in.
final class ThemeNotifierProvider
    extends $NotifierProvider<ThemeNotifier, ThemeSettings> {
  /// Manages [ThemeSettings] state and persists every change to
  /// [SharedPreferencesAsync].
  ///
  /// [build] returns the default state synchronously and schedules an async
  /// [_load] via [Future.microtask] to hydrate from persisted prefs. At most
  /// one frame of default state is shown before the saved theme swaps in.
  ThemeNotifierProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'themeProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$themeNotifierHash();

  @$internal
  @override
  ThemeNotifier create() => ThemeNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeSettings value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeSettings>(value),
    );
  }
}

String _$themeNotifierHash() => r'99128be56091372ff4726b547f01e51daa9e09e1';

/// Manages [ThemeSettings] state and persists every change to
/// [SharedPreferencesAsync].
///
/// [build] returns the default state synchronously and schedules an async
/// [_load] via [Future.microtask] to hydrate from persisted prefs. At most
/// one frame of default state is shown before the saved theme swaps in.

abstract class _$ThemeNotifier extends $Notifier<ThemeSettings> {
  ThemeSettings build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ThemeSettings, ThemeSettings>;
    final element = ref.element as $ClassProviderElement<
        AnyNotifier<ThemeSettings, ThemeSettings>,
        ThemeSettings,
        Object?,
        Object?>;
    return element.handleCreate(ref, build);
  }
}
