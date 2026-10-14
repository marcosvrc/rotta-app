package app.rotta.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.rotta.android.ui.components.Badge
import app.rotta.android.ui.components.RottaCard
import app.rotta.android.ui.components.ScreenHeader
import app.rotta.android.ui.theme.LocalAccent
import app.rotta.android.ui.theme.RottaColors
import app.rotta.shared.format.Format
import app.rotta.shared.model.DayPlan
import app.rotta.shared.model.PlaceCatalog
import app.rotta.shared.model.Trip
import app.rotta.shared.travel.TravelEstimator
import app.rotta.shared.validation.Issue
import app.rotta.shared.validation.Severity

@Composable
fun ItineraryScreen(
    trip: Trip,
    catalog: PlaceCatalog,
    openIssues: List<Issue>,
    selectedDay: Int,
    onSelectDay: (Int) -> Unit,
    loadOf: (DayPlan) -> Int,
    onOpenPlace: (String) -> Unit,
    onOpenCheck: () -> Unit,
) {
    val accent = LocalAccent.current
    val day = trip.days[selectedDay]
    val dayIssues = openIssues.filter { it.dayIndex == selectedDay }

    Column(Modifier.fillMaxSize()) {
        ScreenHeader(title = trip.destination, subtitle = trip.dateRangeLabel) {
            AlertsChip(openIssues, onOpenCheck)
        }

        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp)
                .selectableGroup(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            trip.days.forEachIndexed { index, d ->
                val selected = index == selectedDay
                val hasIssue = openIssues.any { it.dayIndex == index }
                Column(
                    Modifier
                        .weight(1f)
                        .height(60.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (selected) accent.accent else RottaColors.Card)
                        .border(1.dp, if (selected) accent.accent else RottaColors.Line, RoundedCornerShape(16.dp))
                        .selectable(selected = selected, role = Role.Tab, onClick = { onSelectDay(index) }),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "Dia ${index + 1}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (selected) Color.White else RottaColors.Muted,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            d.date.day.toString(),
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (selected) Color.White else RottaColors.Ink,
                        )
                        if (hasIssue) {
                            Spacer(Modifier.width(3.dp))
                            Box(
                                Modifier
                                    .size(6.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(if (selected) Color.White else Color(0xFFC2410C)),
                            )
                        }
                    }
                }
            }
        }

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 120.dp),
        ) {
            val legs = day.stops.zipWithNext { a, b -> TravelEstimator.leg(catalog[a.placeId].location, catalog[b.placeId].location) }
            RottaCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(day.date.shortLabel, fontSize = 13.sp, color = RottaColors.Muted)
                        Text(day.title, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
                    }
                    if (day.rainExpected) Badge("Chuva prevista", Color(0xFFDCE7F5), Color(0xFF1F3B63))
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                    Stat("${day.stops.size}", "paradas")
                    Stat(Format.distance(legs.sumOf { it.distanceKm }), "entre paradas")
                    Stat(Format.duration(loadOf(day)), "de programação")
                }
            }

            Spacer(Modifier.height(14.dp))
            if (day.stops.isEmpty()) {
                Text("Nenhuma parada neste dia.", color = RottaColors.Muted, fontSize = 14.sp)
            }
            day.stops.forEachIndexed { index, stop ->
                val place = catalog[stop.placeId]
                val issue = dayIssues.firstOrNull { it.placeId == stop.placeId }
                Row {
                    Text(
                        stop.start.label,
                        modifier = Modifier.width(52.dp).padding(top = 14.dp),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RottaColors.Ink,
                    )
                    RottaCard(
                        modifier = Modifier.weight(1f),
                        padding = 12.dp,
                        onClick = { onOpenPlace(place.id) },
                        border = when (issue?.severity) {
                            Severity.CRITICA -> Color(0xFFE2A58C)
                            Severity.ATENCAO -> Color(0xFFE8C98A)
                            null -> RottaColors.Line
                        },
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            PlaceAvatar(place.name, place.kind.ordinal)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(place.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
                                Text(
                                    "${place.kind.label} · ${Format.duration(stop.durationMinutes)}",
                                    fontSize = 13.sp,
                                    color = RottaColors.Muted,
                                )
                                if (issue != null) {
                                    Spacer(Modifier.height(4.dp))
                                    Badge(
                                        issue.kind.label,
                                        if (issue.severity == Severity.CRITICA) RottaColors.CriticalBg else RottaColors.WarningBg,
                                        if (issue.severity == Severity.CRITICA) RottaColors.CriticalInk else RottaColors.WarningInk,
                                    )
                                }
                            }
                        }
                    }
                }
                if (index < legs.size) {
                    val leg = legs[index]
                    Text(
                        "${leg.minutes} min ${leg.mode.label} · ${Format.distance(leg.distanceKm)}",
                        modifier = Modifier.padding(start = 64.dp, top = 6.dp, bottom = 6.dp),
                        fontSize = 12.sp,
                        color = RottaColors.Muted,
                    )
                }
            }
            Text(
                "Horários e distâncias de exemplo. No app final eles vêm do Google Places e da Routes API.",
                modifier = Modifier.padding(top = 16.dp),
                fontSize = 12.sp,
                color = RottaColors.Muted,
            )
        }
    }
}

@Composable
private fun Stat(value: String, label: String) {
    Column {
        Text(value, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
        Text(label, fontSize = 12.sp, color = RottaColors.Muted)
    }
}

@Composable
private fun AlertsChip(openIssues: List<Issue>, onClick: () -> Unit) {
    val count = openIssues.size
    val bg = if (count > 0) Color(0xFFFBE9E1) else RottaColors.GoodBg
    val fg = if (count > 0) Color(0xFF8A3412) else RottaColors.GoodInk
    Row(
        Modifier
            .height(40.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(bg)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            if (count > 0) Icons.Filled.Warning else Icons.Filled.CheckCircle,
            contentDescription = null,
            tint = fg,
            modifier = Modifier.size(16.dp),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            when (count) {
                0 -> "Tudo certo"
                1 -> "1 alerta"
                else -> "$count alertas"
            },
            color = fg,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private val avatarColors = listOf(
    Color(0xFFC9DCEB), Color(0xFFE9DCC6), Color(0xFFD8E6CF), Color(0xFFF2D3B3),
    Color(0xFFE5CFE0), Color(0xFFF5E3A8), Color(0xFFD7E3EE),
)

/** Miniatura provisória do lugar; a foto real virá da Places API. */
@Composable
fun PlaceAvatar(name: String, seed: Int, size: Int = 48) {
    Box(
        Modifier
            .size(size.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(avatarColors[seed % avatarColors.size]),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            name.first().uppercase(),
            fontSize = (size / 2.6f).sp,
            fontWeight = FontWeight.SemiBold,
            color = RottaColors.Ink,
            textAlign = TextAlign.Center,
        )
    }
}
