package app.rotta.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp

/** Cores neutras do app; a cor de destaque é escolhida pelo usuário. */
object RottaColors {
    val Ink = Color(0xFF1B2230)
    val Muted = Color(0xFF5F6775)
    val Body = Color(0xFF434B58)
    val Background = Color(0xFFEEF2F7)
    val Card = Color(0xFFFFFFFF)
    val Line = Color(0xFFE4E9F0)
    val Divider = Color(0xFFEEF2F6)
    val Night = Color(0xFF1B2230)
    val NightMuted = Color(0xFFB6BFCC)

    val CriticalBg = Color(0xFFF6C9B6)
    val CriticalInk = Color(0xFF6B2410)
    val WarningBg = Color(0xFFF7E2B8)
    val WarningInk = Color(0xFF5E4208)
    val GoodBg = Color(0xFFDCEFE4)
    val GoodInk = Color(0xFF17603F)
}

/** As quatro opções de cor de destaque, todas com contraste para texto branco. */
enum class AccentOption(val label: String, val color: Color) {
    AZUL("Azul", Color(0xFF1F6FEB)),
    PETROLEO("Verde-petróleo", Color(0xFF0F766E)),
    VIOLETA("Violeta", Color(0xFF6D28D9)),
    TERRACOTA("Terracota", Color(0xFFC2410C)),
}

@Immutable
data class AccentPalette(
    val accent: Color,
    /** Versão escura, para texto sobre o tom claro. */
    val ink: Color,
    /** Versão bem clara, para fundos de destaque. */
    val tint: Color,
    val soft: Color,
    val deep: Color,
)

fun paletteFor(accent: Color) = AccentPalette(
    accent = accent,
    ink = lerp(accent, Color.Black, 0.35f),
    tint = lerp(accent, Color.White, 0.88f),
    soft = lerp(accent, Color.White, 0.5f),
    deep = lerp(accent, Color.Black, 0.55f),
)

val LocalAccent = staticCompositionLocalOf { paletteFor(AccentOption.AZUL.color) }

@Composable
fun RottaTheme(accent: AccentOption, content: @Composable () -> Unit) {
    val palette = paletteFor(accent.color)
    val scheme = lightColorScheme(
        primary = palette.accent,
        onPrimary = Color.White,
        primaryContainer = palette.tint,
        onPrimaryContainer = palette.ink,
        background = RottaColors.Background,
        onBackground = RottaColors.Ink,
        surface = RottaColors.Card,
        onSurface = RottaColors.Ink,
        onSurfaceVariant = RottaColors.Muted,
        outline = RottaColors.Line,
    )
    CompositionLocalProvider(LocalAccent provides palette) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}
