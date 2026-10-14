package app.rotta.android.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.rotta.android.ui.components.RottaCard
import app.rotta.android.ui.components.ScreenHeader
import app.rotta.android.ui.components.SectionTitle
import app.rotta.android.ui.components.Segmented
import app.rotta.android.ui.components.Stepper
import app.rotta.android.ui.theme.LocalAccent
import app.rotta.android.ui.theme.RottaColors
import app.rotta.shared.cost.CostCategory
import app.rotta.shared.cost.CostEstimate
import app.rotta.shared.cost.FoodLevel
import app.rotta.shared.cost.StayLevel
import app.rotta.shared.format.Format
import app.rotta.shared.model.Trip
import kotlin.math.roundToInt

@Composable
fun CostsScreen(
    trip: Trip,
    stay: StayLevel,
    food: FoodLevel,
    estimate: CostEstimate,
    onTravelers: (Int) -> Unit,
    onStay: (StayLevel) -> Unit,
    onFood: (FoodLevel) -> Unit,
) {
    val accent = LocalAccent.current
    val colors = mapOf(
        CostCategory.PASSAGENS to accent.accent,
        CostCategory.HOSPEDAGEM to accent.soft,
        CostCategory.ALIMENTACAO to Color(0xFFC2522A),
        CostCategory.PASSEIOS to Color(0xFFE8B07A),
        CostCategory.TRANSPORTE_LOCAL to RottaColors.Muted,
    )
    val status = estimate.against(trip.budgetBrl)

    Column(Modifier.fillMaxSize()) {
        ScreenHeader(
            title = "Simulador de custos",
            subtitle = "${trip.destination} · ${trip.days.size} dias, ${trip.nights} noites",
        )
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 12.dp, bottom = 120.dp),
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(RottaColors.Night)
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        Text("Total estimado", fontSize = 13.sp, color = RottaColors.NightMuted)
                        Text(Format.brl(estimate.totalBrl), fontSize = 34.sp, fontWeight = FontWeight.Medium, color = Color.White)
                        Text("${Format.brl(estimate.perPersonBrl)} por pessoa", fontSize = 13.sp, color = RottaColors.NightMuted)
                    }
                    Text(
                        if (status.overBudget) "Acima do orçamento" else "Dentro do orçamento",
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (status.overBudget) RottaColors.CriticalBg else RottaColors.GoodBg)
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        color = if (status.overBudget) RottaColors.CriticalInk else RottaColors.GoodInk,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Spacer(Modifier.height(14.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .semantics { contentDescription = "Divisão do custo por categoria" },
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    estimate.lines.filter { it.valueBrl > 0 }.forEach { line ->
                        Box(
                            Modifier
                                .weight(line.valueBrl.toFloat())
                                .fillMaxSize()
                                .background(colors.getValue(line.category)),
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth()) {
                    Text("Orçamento ${Format.brl(trip.budgetBrl)}", fontSize = 12.sp, color = RottaColors.NightMuted, modifier = Modifier.weight(1f))
                    Text(
                        if (status.overBudget) "Faltam ${Format.brl(-status.differenceBrl)}" else "Sobram ${Format.brl(status.differenceBrl)}",
                        fontSize = 12.sp,
                        color = RottaColors.NightMuted,
                    )
                }
            }

            SectionTitle("Ajustes")
            RottaCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Viajantes", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink, modifier = Modifier.weight(1f))
                    Stepper(trip.travelers, onTravelers, 1..8, "um viajante")
                }
                Spacer(Modifier.height(14.dp))
                Text("Hospedagem", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
                Spacer(Modifier.height(6.dp))
                Segmented(StayLevel.entries.map { it.label }, stay.ordinal, { onStay(StayLevel.entries[it]) })
                Spacer(Modifier.height(14.dp))
                Text("Alimentação", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
                Spacer(Modifier.height(6.dp))
                Segmented(FoodLevel.entries.map { it.label }, food.ordinal, { onFood(FoodLevel.entries[it]) })
            }

            SectionTitle("Por categoria")
            RottaCard(padding = 0.dp) {
                estimate.lines.forEach { line ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(10.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(colors.getValue(line.category)),
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(line.category.label, fontSize = 14.sp, color = RottaColors.Ink, modifier = Modifier.weight(1f))
                        Text(
                            "${(estimate.share(line.category) * 100).roundToInt()}%",
                            fontSize = 13.sp,
                            color = RottaColors.Muted,
                            modifier = Modifier.width(44.dp),
                            textAlign = TextAlign.End,
                        )
                        Text(
                            Format.brl(line.valueBrl),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = RottaColors.Ink,
                            modifier = Modifier.width(96.dp),
                            textAlign = TextAlign.End,
                        )
                    }
                }
            }
            Text(
                "Valores de referência de exemplo para Lisboa. No app final, câmbio e preços vêm de APIs.",
                modifier = Modifier.padding(top = 12.dp),
                fontSize = 12.sp,
                color = RottaColors.Muted,
            )
        }
    }
}
