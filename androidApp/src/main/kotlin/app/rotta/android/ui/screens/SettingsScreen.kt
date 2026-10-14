package app.rotta.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.rotta.android.ui.components.RottaCard
import app.rotta.android.ui.components.ScreenHeader
import app.rotta.android.ui.components.SectionTitle
import app.rotta.android.ui.components.Segmented
import app.rotta.android.ui.components.ToggleChip
import app.rotta.android.ui.theme.AccentOption
import app.rotta.android.ui.theme.RottaColors
import app.rotta.shared.model.Pace

private val ALL_INTERESTS = listOf("História", "Gastronomia", "Natureza", "Praia", "Vida noturna", "Compras", "Arte")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    accent: AccentOption,
    onAccent: (AccentOption) -> Unit,
    pace: Pace,
    onPace: (Pace) -> Unit,
    interests: Set<String>,
    onInterest: (String, Boolean) -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        ScreenHeader(title = "Ajustes", subtitle = "Do jeito que você viaja")
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 120.dp),
        ) {
            SectionTitle("Cor do app")
            RottaCard {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .selectableGroup(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    AccentOption.entries.forEach { option ->
                        val selected = option == accent
                        Column(
                            Modifier
                                .width(72.dp)
                                .selectable(selected = selected, role = Role.RadioButton, onClick = { onAccent(option) })
                                .padding(vertical = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(
                                Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(option.color)
                                    .border(3.dp, if (selected) RottaColors.Ink else Color.Transparent, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (selected) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White)
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(option.label, fontSize = 12.sp, color = RottaColors.Body, maxLines = 1)
                        }
                    }
                }
            }

            SectionTitle("Ritmo das viagens")
            RottaCard {
                Segmented(Pace.entries.map { it.label }, pace.ordinal, { onPace(Pace.entries[it]) })
                Spacer(Modifier.height(8.dp))
                Text(
                    "O validador usa o ritmo para avisar quando um dia passa de ${pace.maxMinutesPerDay / 60} horas de programação.",
                    fontSize = 13.sp,
                    color = RottaColors.Muted,
                )
            }

            SectionTitle("Interesses")
            RottaCard {
                Text(
                    "Usados pelo simulador e, no futuro, pelo agente para sugerir roteiros.",
                    fontSize = 13.sp,
                    color = RottaColors.Muted,
                )
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ALL_INTERESTS.forEach { name ->
                        ToggleChip(name, name in interests) { onInterest(name, it) }
                    }
                }
            }

            SectionTitle("Sobre")
            RottaCard {
                Text("Rotta 0.1.0", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RottaColors.Ink)
                Text(
                    "Versão de testes com uma viagem de exemplo a Lisboa. Os dados ainda ficam só neste aparelho.",
                    fontSize = 13.sp,
                    color = RottaColors.Muted,
                )
            }
        }
    }
}
