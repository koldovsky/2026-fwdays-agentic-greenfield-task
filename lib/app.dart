import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers/theme_provider.dart';
import 'screens/home_screen.dart';
import 'theme.dart';

/// Root widget. Watches [themeProvider] and passes both a light and
/// dark [ThemeData] to [MaterialApp], letting Flutter pick the right one
/// based on [ThemeSettings.mode].
class ChordDiceApp extends ConsumerWidget {
  const ChordDiceApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(themeProvider);
    return MaterialApp(
      title: 'Chord Dice',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(settings.palette, Brightness.light),
      darkTheme: buildTheme(settings.palette, Brightness.dark),
      themeMode: settings.mode,
      home: const HomeScreen(),
    );
  }
}
