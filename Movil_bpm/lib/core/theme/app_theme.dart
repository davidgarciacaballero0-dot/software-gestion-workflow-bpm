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
  static const Color primaryContainer = Color(0xFF1E1B4B); // Nesting
  static const Color secondary = Color(0xFF515F74); 
  static const Color error     = Color(0xFFBA1A1A); 
  static const Color surface   = Color(0xFFF7F9FB); 
  static const Color surfaceContainerLow = Color(0xFFF2F4F6);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF191C1E); 
  static const Color subtle    = Color(0xFF47464F); 

  // Tokens de Diseño Específicos
  static const Color ghostBorder = Color(0x26C8C5D0);    // outline-variant 15% (the "felt not seen" rule)
  static const Color ambientShadow = Color(0x0F070235);  // Shadow tinted with primary (6% opacity)

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
      scaffoldBackgroundColor: surface,
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.inter(fontSize: 48, fontWeight: FontWeight.w700, letterSpacing: -1.5, color: onSurface),
        headlineMedium: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w600, color: onSurface),
        titleMedium: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w500, color: onSurface),
        bodyMedium: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: subtle),
        labelSmall: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1.0, color: subtle),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: surface.withOpacity(0.8),
        foregroundColor: onSurface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: onSurface,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceContainerLowest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ghostBorder, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ghostBorder, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        labelStyle: GoogleFonts.inter(color: subtle, fontSize: 13),
        floatingLabelStyle: GoogleFonts.inter(color: primary, fontWeight: FontWeight.w600),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: surfaceContainerLowest,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: ghostBorder, width: 1),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 10),
      ),
      iconTheme: const IconThemeData(
        color: primary,
        size: 24,
      ),
    );
  }
}

