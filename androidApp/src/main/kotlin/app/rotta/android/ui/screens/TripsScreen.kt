package app.rotta.android.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.rotta.android.ui.components.ListRow
import app.rotta.android.ui.components.RottaCard
import app.rotta.android.ui.components.SectionTitle
import app.rotta.android.ui.theme.LocalAccent
import app.rotta.android.ui.theme.RottaColors
import app.rotta.shared.cost.CostEstimate
import app.rotta.shared.format.Format
import app.rotta.shared.model.Trip

@Composable
fun TripsScreen(
    trip: Trip,
    openIssues: Int,
    estimate: CostEstimate,
    onOpenItinerary: () -> Unit,
    onOpenCheck: () -> Unit,
    onOpenCosts: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val accent = LocalAccent.current
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(top = 16.dp, bottom = 120.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Olá!", fontSize = 14.sp, color = RottaColors.Muted)
                Text("Suas viagens", fontSize = 30.sp, fontWeight = FontWeight.Medium, color = RottaColors.Ink)
            }
            Box(
                Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(accent.accent)
                    .clickable(role = Role.Button, onClick = onOpenSettings)
                    .semantics { contentDescription = "Perfil e ajustes" },
                contentAlignment = Alignment.Center,
            ) {
                Text("R", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
            }
        }

        SectionTitle("Próxima viagem")
        RottaCard(padding = 0.dp, onClick = onOpenItinerary) {
            CityIllustration(Modifier.fillMaxWidth().height(150.dp))
            Column(Modifier.padding(16.dp)) {
                Text(
                    trip.dateRangeLabel,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(accent.tint)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    color = accent.ink,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(8.dp))
                Text("${trip.destination}, ${trip.country}", fontSize = 22.sp, fontWeight = FontWeight.Medium, color = RottaColors.Ink)
                Text(
                    "${trip.days.size} dias · ${trip.stopCount} paradas · ${trip.travelers} viajantes",
                    fontSize = 14.sp,
                    color = RottaColors.Muted,
                )
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MiniStat("Custo estimado", Format.brl(estimate.totalBrl), Modifier.weight(1f))
                    MiniStat("Orçamento", Format.brl(trip.budgetBrl), Modifier.weight(1f))
                }
            }
        }

        SectionTitle("Continue planejando")
        RottaCard(padding = 0.dp) {
            if (openIssues > 0) {
                ListRow(
                    title = if (openIssues == 1) "Resolver 1 alerta do roteiro" else "Resolver $openIssues alertas do roteiro",
                    subtitle = "Horários, clima e ritmo conferidos",
                    icon = Icons.Filled.Warning,
                    onClick = onOpenCheck,
                    trailing = { Chevron() },
                )
            } else {
                ListRow(
                    title = "Roteiro sem pendências",
                    subtitle = "Tudo conferido",
                    icon = Icons.Filled.CheckCircle,
                    onClick = onOpenCheck,
                    trailing = { Chevron() },
                )
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(RottaColors.Divider))
            val status = estimate.against(trip.budgetBrl)
            ListRow(
                title = "Ajustar hospedagem e custos",
                subtitle = if (status.overBudget) {
                    "Faltam ${Format.brl(-status.differenceBrl)} no orçamento"
                } else {
                    "Sobram ${Format.brl(status.differenceBrl)} no orçamento"
                },
                icon = Icons.Filled.ShoppingCart,
                onClick = onOpenCosts,
                trailing = { Chevron() },
            )
        }

        SectionTitle("Rascunhos")
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DraftCard("Porto", "Sem datas", Color(0xFFF2D3B3))
            DraftCard("Santiago", "Março · 7 dias", Color(0xFFC9DCEB))
            DraftCard("Bariloche", "Julho", Color(0xFFD8E6CF))
        }
    }
}

@Composable
private fun MiniStat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(RottaColors.Background)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(label, fontSize = 12.sp, color = RottaColors.Muted)
        Text(value, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
    }
}

@Composable
private fun DraftCard(name: String, info: String, color: Color) {
    Column(
        Modifier
            .width(150.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(RottaColors.Card)
            .border(1.dp, RottaColors.Line, RoundedCornerShape(18.dp))
            .padding(12.dp),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(56.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(color),
        )
        Spacer(Modifier.height(10.dp))
        Text(name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
        Text(info, fontSize = 13.sp, color = RottaColors.Muted)
    }
}

@Composable
fun Chevron() {
    Icon(
        Icons.AutoMirrored.Filled.KeyboardArrowRight,
        contentDescription = null,
        tint = RottaColors.Muted,
    )
}

/** Ilustração simples da cidade, na cor de destaque escolhida. */
@Composable
fun CityIllustration(modifier: Modifier = Modifier) {
    val accent = LocalAccent.current
    Canvas(modifier.background(accent.ink)) {
        val w = size.width
        val h = size.height
        drawCircle(Color(0xFFF2B880), radius = h * 0.16f, center = Offset(w * 0.78f, h * 0.32f))
        val hills = Path().apply {
            moveTo(0f, h * 0.72f)
            lineTo(w * 0.12f, h * 0.58f)
            lineTo(w * 0.26f, h * 0.66f)
            lineTo(w * 0.42f, h * 0.48f)
            lineTo(w * 0.58f, h * 0.62f)
            lineTo(w * 0.74f, h * 0.5f)
            lineTo(w, h * 0.6f)
            lineTo(w, h)
            lineTo(0f, h)
            close()
        }
        drawPath(hills, accent.accent)
        val city = Path().apply {
            moveTo(0f, h)
            var x = 0f
            var i = 0
            val heights = floatArrayOf(0.22f, 0.34f, 0.18f, 0.4f, 0.26f, 0.3f, 0.16f, 0.36f, 0.24f, 0.2f, 0.32f, 0.18f)
            while (x < w) {
                val bh = h * heights[i % heights.size]
                lineTo(x, h - bh)
                x += w / 14f
                lineTo(x, h - bh)
                i++
            }
            lineTo(w, h)
            close()
        }
        drawPath(city, accent.deep)
    }
}
