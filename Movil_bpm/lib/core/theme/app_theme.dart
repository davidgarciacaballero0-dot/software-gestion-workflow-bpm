// ─────────────────────────────────────────────────────────────
// lib/core/theme/app_theme.dart
// Sistema de diseño Material 3 — Client-Friendly & Minimalist.
// Paleta: Azul corporativo (#1A73E8) + Verde éxito (#00897B).
// Tipografía: Google Fonts "Outfit" (legible, moderna, confiable).
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // ── Colores de marca (Sincronizados con la Web) ───────────────────
  static const Color primary   = Color(0xFF070235); // Azul profundo (Orchestrated Monolith)
  static const Color secondary = Color(0xFF1E1B4B); // Contenedor primario
  static const Color error     = Color(0xFFBA1A1A); // Rojo Material Web
  static const Color surface   = Color(0xFFF7F9FB); // Fondo claro web
  static const Color onSurface = Color(0xFF191C1E); // Texto principal
  static const Color subtle    = Color(0xFF47464F); // Texto secundario

  // Vidrio/Glassmorphism tokens
  static const Color glassBackground = Color(0xCCF7F9FB); // 80% opacidad del surface
  static const Color ghostBorder = Color(0x26C8C5D0);    // outline-variant 15%

  static ThemeData get light {
    final base = ColorScheme.fromSeed(
      seedColor: primary,
      secondary: secondary,
      surface: surface,
      error: error,
      brightness: Brightness.light,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: base,
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: onSurface,
        displayColor: onSurface,
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent, // Glass effect usually transparent
        foregroundColor: onSurface,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: onSurface,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F3F4),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        labelStyle: GoogleFonts.inter(color: subtle),
        hintStyle: GoogleFonts.inter(color: subtle),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x26C8C5D0)), // Ghost border
        ),
        margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
      ),
      scaffoldBackgroundColor: surface,
    );
  }
}

