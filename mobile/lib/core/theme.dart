import 'package:flutter/material.dart';

const brandNavy = Color(0xFF0F1729);
const brandBlue = Color(0xFF1F4F91);
const brandAmber = Color(0xFFF5A623);
const canvasCream = Color(0xFFF6F5F1);

Widget _buttonContent(
  BuildContext context,
  Set<WidgetState> states,
  Widget? child,
) {
  if (MediaQuery.disableAnimationsOf(context)) {
    return child ?? const SizedBox.shrink();
  }
  final pressed =
      states.contains(WidgetState.pressed) &&
      !states.contains(WidgetState.disabled);
  return AnimatedScale(
    scale: pressed ? 0.96 : 1,
    duration: Duration(milliseconds: pressed ? 80 : 140),
    curve: Curves.easeOut,
    child: child,
  );
}

ThemeData buildRentAwayTheme() {
  final colors = ColorScheme.fromSeed(
    seedColor: brandBlue,
    primary: brandNavy,
    secondary: brandAmber,
    surface: Colors.white,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: colors,
    scaffoldBackgroundColor: canvasCream,
    appBarTheme: const AppBarTheme(
      backgroundColor: canvasCream,
      foregroundColor: brandNavy,
      centerTitle: false,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: brandNavy,
        fontSize: 21,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Color(0xFFE7E7E3)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFD9DDE4)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFD9DDE4)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: brandBlue, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        foregroundBuilder: _buttonContent,
        minimumSize: const Size(48, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundBuilder: _buttonContent,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    textButtonTheme: const TextButtonThemeData(
      style: ButtonStyle(foregroundBuilder: _buttonContent),
    ),
    iconButtonTheme: const IconButtonThemeData(
      style: ButtonStyle(foregroundBuilder: _buttonContent),
    ),
  );
}
