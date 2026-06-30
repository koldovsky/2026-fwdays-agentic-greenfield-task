// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shake_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ShakeNotifier)
final shakeProvider = ShakeNotifierProvider._();

final class ShakeNotifierProvider
    extends $NotifierProvider<ShakeNotifier, ShakeSettings> {
  ShakeNotifierProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'shakeProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$shakeNotifierHash();

  @$internal
  @override
  ShakeNotifier create() => ShakeNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ShakeSettings value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ShakeSettings>(value),
    );
  }
}

String _$shakeNotifierHash() => r'ef35b930ef04ae5fafd2f9d0654b178febd1ecb9';

abstract class _$ShakeNotifier extends $Notifier<ShakeSettings> {
  ShakeSettings build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ShakeSettings, ShakeSettings>;
    final element = ref.element as $ClassProviderElement<
        AnyNotifier<ShakeSettings, ShakeSettings>,
        ShakeSettings,
        Object?,
        Object?>;
    return element.handleCreate(ref, build);
  }
}
