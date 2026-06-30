// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notation_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(NotationNotifier)
final notationProvider = NotationNotifierProvider._();

final class NotationNotifierProvider
    extends $NotifierProvider<NotationNotifier, NotationPreference> {
  NotationNotifierProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'notationProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$notationNotifierHash();

  @$internal
  @override
  NotationNotifier create() => NotationNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(NotationPreference value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<NotationPreference>(value),
    );
  }
}

String _$notationNotifierHash() => r'9b696ed5ce1b6521aa1a425995a0985099162af9';

abstract class _$NotationNotifier extends $Notifier<NotationPreference> {
  NotationPreference build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<NotationPreference, NotationPreference>;
    final element = ref.element as $ClassProviderElement<
        AnyNotifier<NotationPreference, NotationPreference>,
        NotationPreference,
        Object?,
        Object?>;
    return element.handleCreate(ref, build);
  }
}
