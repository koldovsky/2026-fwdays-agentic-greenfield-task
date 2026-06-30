// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dice_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(DiceNotifier)
final diceProvider = DiceNotifierProvider._();

final class DiceNotifierProvider
    extends $NotifierProvider<DiceNotifier, DiceState> {
  DiceNotifierProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'diceProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$diceNotifierHash();

  @$internal
  @override
  DiceNotifier create() => DiceNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DiceState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DiceState>(value),
    );
  }
}

String _$diceNotifierHash() => r'84acb8e05a804ed7426aa4838405ef4936b2dcba';

abstract class _$DiceNotifier extends $Notifier<DiceState> {
  DiceState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<DiceState, DiceState>;
    final element = ref.element as $ClassProviderElement<
        AnyNotifier<DiceState, DiceState>, DiceState, Object?, Object?>;
    return element.handleCreate(ref, build);
  }
}
