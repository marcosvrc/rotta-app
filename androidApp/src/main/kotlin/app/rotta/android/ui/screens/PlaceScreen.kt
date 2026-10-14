package app.rotta.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.rotta.android.ui.components.Badge
import app.rotta.android.ui.components.RottaCard
import app.rotta.android.ui.components.Segmented
import app.rotta.android.ui.theme.LocalAccent
import app.rotta.android.ui.theme.RottaColors
import app.rotta.shared.format.Format
import app.rotta.shared.model.Place
import app.rotta.shared.model.Trip

@Composable
fun PlaceScreen(place: Place, trip: Trip, onBack: () -> Unit) {
    val accent = LocalAccent.current
    val uriHandler = LocalUriHandler.current
    var tab by remember(place.id) { mutableIntStateOf(0) }
    val dayIndex = trip.dayIndexOf(place.id)
    val stop = dayIndex?.let { i -> trip.days[i].stops.first { it.placeId == place.id } }

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(220.dp),
        ) {
            CityIllustration(Modifier.fillMaxSize())
            Box(
                Modifier
                    .padding(16.dp)
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .clickable(role = Role.Button, onClick = onBack)
                    .semantics { contentDescription = "Voltar" },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = RottaColors.Ink)
            }
            Badge(
                "Foto do Google Places",
                Color(0xB81B2230),
                Color.White,
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(12.dp),
            )
        }

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Text(
                "${place.kind.label} · ${place.neighborhood}".uppercase(),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.8.sp,
                color = accent.ink,
            )
            Text(place.name, fontSize = 28.sp, fontWeight = FontWeight.Medium, color = RottaColors.Ink)
            Spacer(Modifier.height(4.dp))
            Text(place.hours.label, fontSize = 14.sp, color = RottaColors.Muted)
            Spacer(Modifier.height(16.dp))

            Segmented(listOf("História", "Informações", "Dicas"), tab, { tab = it })
            Spacer(Modifier.height(14.dp))

            when (tab) {
                0 -> {
                    Badge("Resumo com IA a partir da Wikipedia", accent.tint, accent.ink)
                    Spacer(Modifier.height(10.dp))
                    Text(place.story, fontSize = 16.sp, lineHeight = 24.sp, color = RottaColors.Ink)
                    val url = place.sourceUrl
                    if (url != null) {
                        Text(
                            "Ler a fonte na Wikipedia",
                            modifier = Modifier
                                .padding(top = 12.dp)
                                .clickable(role = Role.Button) { uriHandler.openUri(url) }
                                .padding(vertical = 8.dp),
                            color = accent.accent,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                }
                1 -> RottaCard(padding = 0.dp) {
                    InfoRow("Horário", place.hours.label)
                    InfoRow("Tempo sugerido", Format.duration(place.suggestedMinutes))
                    InfoRow("Ambiente", if (place.indoor) "Coberto" else "Ao ar livre")
                    InfoRow("Bairro", place.neighborhood)
                }
                else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    place.tips.forEach { tip ->
                        Text(
                            tip,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(RottaColors.Card)
                                .padding(14.dp),
                            fontSize = 14.sp,
                            lineHeight = 20.sp,
                            color = RottaColors.Ink,
                        )
                    }
                }
            }
        }

        Row(
            Modifier
                .fillMaxWidth()
                .background(RottaColors.Card)
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            val label = if (dayIndex != null && stop != null) {
                "No roteiro · Dia ${dayIndex + 1}, ${stop.start.label}"
            } else {
                "Fora do roteiro"
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(RoundedCornerShape(26.dp))
                    .background(if (dayIndex != null) accent.tint else RottaColors.Background),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    color = if (dayIndex != null) accent.ink else RottaColors.Muted,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, fontSize = 14.sp, color = RottaColors.Muted)
        Spacer(Modifier.size(12.dp))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink, modifier = Modifier.weight(1f, fill = false))
    }
}
