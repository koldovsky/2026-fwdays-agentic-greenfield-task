// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dice_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(diceService)
final diceServiceProvider = DiceServiceProvider._();

final class DiceServiceProvider
    extends $FunctionalProvider<DiceService, DiceService, DiceService>
    with $Provider<DiceService> {
  DiceServiceProvider._()
      : super(
          from: null,
          argument: null,
          retry: null,
          name: r'diceServiceProvider',
          isAutoDispose: false,
          dependencies: null,
          $allTransitiveDependencies: null,
        );

  @override
  String debugGetCreateSourceHash() => _$diceServiceHash();

  @$internal
  @override
  $ProviderElement<DiceService> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  DiceService create(Ref ref) {
    return diceService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DiceService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DiceService>(value),
    );
  }
}

String _$diceServiceHash() => r'94bdf8a0bf6dc7088f7046a1f6e24e511c2d7b48';
