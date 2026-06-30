import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'providers/theme_provider.dart';

/// Locks the app to portrait-up orientation before [runApp] so that
/// the constraint is in effect from the very first frame, then starts
/// the app with a [SharedPreferencesAsync] instance injected into
/// [sharedPreferencesProvider]. Providers hydrate asynchronously from
/// within their [build] methods, so no prefs read is needed here.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  final prefs = SharedPreferencesAsync();
  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const ChordDiceApp(),
    ),
  );
}
