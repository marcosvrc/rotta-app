package app.rotta.android.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.rotta.android.ui.components.Badge
import app.rotta.android.ui.components.PrimaryButton
import app.rotta.android.ui.components.RottaCard
import app.rotta.android.ui.components.ScreenHeader
import app.rotta.android.ui.components.SectionTitle
import app.rotta.android.ui.theme.LocalAccent
import app.rotta.android.ui.theme.RottaColors
import app.rotta.shared.model.PlaceCatalog
import app.rotta.shared.model.Trip
import app.rotta.shared.validation.Issue
import app.rotta.shared.validation.Severity
import app.rotta.shared.validation.ValidationReport
import kotlin.math.max

@Composable
fun CheckScreen(
    trip: Trip,
    catalog: PlaceCatalog,
    report: ValidationReport,
    dismissed: Set<String>,
    lastApplied: String?,
    onApply: (Issue) -> Unit,
    onKeep: (Issue) -> Unit,
    onBack: () -> Unit,
) {
    val accent = LocalAccent.current
    val open = report.issues.filter { it.id !in dismissed }
    val kept = report.issues.filter { it.id in dismissed }
    val score = max(
        0,
        100 - 12 * open.count { it.severity == Severity.CRITICA } - 6 * open.count { it.severity == Severity.ATENCAO },
    )

    Column(
        Modifier
            .fillMaxSize()
            .navigationBarsPadding(),
    ) {
        ScreenHeader(
            title = "Verificação do roteiro",
            subtitle = "${trip.destination} · ${report.checkedStops} paradas conferidas",
            onBack = onBack,
        )
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 12.dp, bottom = 32.dp),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(RottaColors.Night)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ScoreRing(score, if (open.isEmpty()) accent.soft else Color(0xFFE8B07A))
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(
                        when (open.size) {
                            0 -> "Roteiro pronto para viajar"
                            1 -> "1 ponto para revisar"
                            else -> "${open.size} pontos para revisar"
                        },
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        "Horários, deslocamentos, clima e ritmo conferidos em código.",
                        color = RottaColors.NightMuted,
                        fontSize = 13.sp,
                    )
                }
            }

            if (lastApplied != null) {
                Row(
                    Modifier
                        .padding(top = 12.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(RottaColors.GoodBg)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null, tint = RottaColors.GoodInk, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Plano B aplicado: $lastApplied", color = RottaColors.GoodInk, fontSize = 13.sp)
                }
            }

            if (open.isNotEmpty()) SectionTitle("Precisa de atenção")
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                open.forEach { issue ->
                    IssueCard(trip, issue, onApply = { onApply(issue) }, onKeep = { onKeep(issue) })
                }
            }

            if (kept.isNotEmpty()) {
                SectionTitle("Mantidos como estavam")
                kept.forEach { issue ->
                    Text(
                        "· ${issue.title}",
                        modifier = Modifier.padding(start = 4.dp, bottom = 4.dp),
                        fontSize = 14.sp,
                        color = RottaColors.Muted,
                    )
                }
            }

            SectionTitle("Tudo certo")
            RottaCard(padding = 14.dp) {
                report.passedChecks.forEachIndexed { index, line ->
                    if (index > 0) Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Check, contentDescription = null, tint = RottaColors.GoodInk, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(line, fontSize = 14.sp, color = RottaColors.Ink)
                    }
                }
            }
        }
    }
}

@Composable
private fun IssueCard(trip: Trip, issue: Issue, onApply: () -> Unit, onKeep: () -> Unit) {
    val accent = LocalAccent.current
    val day = trip.days[issue.dayIndex]
    val critical = issue.severity == Severity.CRITICA
    RottaCard(border = if (critical) Color(0xFFE2A58C) else RottaColors.Line) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Badge(
                issue.kind.label,
                if (critical) RottaColors.CriticalBg else RottaColors.WarningBg,
                if (critical) RottaColors.CriticalInk else RottaColors.WarningInk,
            )
            Spacer(Modifier.width(8.dp))
            val where = buildString {
                append("Dia ${issue.dayIndex + 1} · ${day.date.shortLabel}")
                issue.placeId?.let { id ->
                    val stop = day.stops.firstOrNull { it.placeId == id }
                    if (stop != null) append(" · ${stop.start.label}")
                }
            }
            Text(where, fontSize = 12.sp, color = RottaColors.Muted)
        }
        Spacer(Modifier.height(8.dp))
        Text(issue.title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
        Text(issue.detail, fontSize = 13.sp, lineHeight = 19.sp, color = RottaColors.Body)

        val fixText = issue.fixDescription
        if (fixText != null && issue.fix != null) {
            Spacer(Modifier.height(10.dp))
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(RottaColors.Background)
                    .padding(12.dp),
            ) {
                Text(
                    "PLANO B",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = accent.ink,
                )
                Spacer(Modifier.height(4.dp))
                Text(fixText, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = RottaColors.Ink)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("Aplicar", onApply, Modifier.weight(1f))
                    PrimaryButton("Manter assim", onKeep, Modifier.weight(1f), filled = false)
                }
            }
        } else {
            Spacer(Modifier.height(10.dp))
            PrimaryButton("Entendi", onKeep, Modifier.fillMaxWidth(), filled = false)
        }
    }
}

@Composable
private fun ScoreRing(score: Int, color: Color) {
    Box(
        Modifier
            .size(68.dp)
            .semantics { contentDescription = "Nota do roteiro: $score de 100" },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 6.dp.toPx()
            val inset = Offset(stroke / 2, stroke / 2)
            val ring = Size(size.width - stroke, size.height - stroke)
            drawArc(
                color = Color(0xFF39445A),
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = inset,
                size = ring,
                style = Stroke(width = stroke),
            )
            drawArc(
                color = color,
                startAngle = -90f,
                sweepAngle = 360f * score / 100f,
                useCenter = false,
                topLeft = inset,
                size = ring,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
        Text(score.toString(), color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
    }
}
