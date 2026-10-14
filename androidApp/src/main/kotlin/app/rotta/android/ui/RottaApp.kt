package app.rotta.android.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import app.rotta.android.ui.components.PillNavBar
import app.rotta.android.ui.screens.CheckScreen
import app.rotta.android.ui.screens.CostsScreen
import app.rotta.android.ui.screens.ItineraryScreen
import app.rotta.android.ui.screens.PlaceScreen
import app.rotta.android.ui.screens.SettingsScreen
import app.rotta.android.ui.screens.TripsScreen
import app.rotta.android.ui.theme.AccentOption
import app.rotta.android.ui.theme.RottaColors
import app.rotta.android.ui.theme.RottaTheme
import app.rotta.shared.cost.CostEstimate
import app.rotta.shared.cost.CostInput
import app.rotta.shared.cost.CostSimulator
import app.rotta.shared.cost.FoodLevel
import app.rotta.shared.cost.StayLevel
import app.rotta.shared.model.Trip
import app.rotta.shared.sample.LisboaSample
import app.rotta.shared.validation.Issue
import app.rotta.shared.validation.ItineraryValidator

enum class Tab(val label: String, val icon: ImageVector) {
    VIAGENS("Viagens", Icons.Filled.Home),
    ROTEIRO("Roteiro", Icons.Filled.DateRange),
    CUSTOS("Custos", Icons.Filled.ShoppingCart),
    AJUSTES("Ajustes", Icons.Filled.Settings),
}

sealed interface Detail {
    data class PlaceDetail(val placeId: String) : Detail
    data object Check : Detail
}

/** Estado da sessão. Ainda em memória: o Firestore entra na próxima etapa. */
class RottaState {
    var tab by mutableStateOf(Tab.VIAGENS)
    val details = mutableStateListOf<Detail>()
    var trip by mutableStateOf(LisboaSample.trip())
    var selectedDay by mutableIntStateOf(1)
    var dismissed by mutableStateOf(setOf<String>())
    var lastApplied by mutableStateOf<String?>(null)
    var accent by mutableStateOf(AccentOption.AZUL)
    var stay by mutableStateOf(StayLevel.CONFORTO)
    var food by mutableStateOf(FoodLevel.MEDIA)
    var interests by mutableStateOf(setOf("História", "Gastronomia"))

    val catalog = LisboaSample.catalog

    fun open(detail: Detail) {
        details.add(detail)
    }

    fun back() {
        if (details.isNotEmpty()) details.removeAt(details.lastIndex)
    }

    fun estimate(trip: Trip = this.trip): CostEstimate = CostSimulator.estimate(
        CostInput(travelers = trip.travelers, nights = trip.nights, days = trip.days.size, stay = stay, food = food),
    )
}

@Composable
fun RottaApp() {
    val state = remember { RottaState() }
    val validator = remember { ItineraryValidator(state.catalog) }
    val report = remember(state.trip) { validator.validate(state.trip) }
    val openIssues = report.issues.filter { it.id !in state.dismissed }

    fun applyFix(issue: Issue) {
        val fix = issue.fix ?: return
        state.trip = validator.apply(state.trip, fix)
        state.lastApplied = issue.fixDescription
    }

    RottaTheme(state.accent) {
        Box(
            Modifier
                .fillMaxSize()
                .background(RottaColors.Background)
                .statusBarsPadding(),
        ) {
            val detail = state.details.lastOrNull()
            BackHandler(enabled = detail != null) { state.back() }
            BackHandler(enabled = detail == null && state.tab != Tab.VIAGENS) { state.tab = Tab.VIAGENS }

            when (detail) {
                null -> {
                    when (state.tab) {
                        Tab.VIAGENS -> TripsScreen(
                            trip = state.trip,
                            openIssues = openIssues.size,
                            estimate = state.estimate(),
                            onOpenItinerary = { state.tab = Tab.ROTEIRO },
                            onOpenCheck = { state.open(Detail.Check) },
                            onOpenCosts = { state.tab = Tab.CUSTOS },
                            onOpenSettings = { state.tab = Tab.AJUSTES },
                        )
                        Tab.ROTEIRO -> ItineraryScreen(
                            trip = state.trip,
                            catalog = state.catalog,
                            openIssues = openIssues,
                            selectedDay = state.selectedDay.coerceIn(0, state.trip.days.lastIndex),
                            onSelectDay = { state.selectedDay = it },
                            loadOf = { validator.dayLoadMinutes(it) },
                            onOpenPlace = { state.open(Detail.PlaceDetail(it)) },
                            onOpenCheck = { state.open(Detail.Check) },
                        )
                        Tab.CUSTOS -> CostsScreen(
                            trip = state.trip,
                            stay = state.stay,
                            food = state.food,
                            estimate = state.estimate(),
                            onTravelers = { state.trip = state.trip.copy(travelers = it) },
                            onStay = { state.stay = it },
                            onFood = { state.food = it },
                        )
                        Tab.AJUSTES -> SettingsScreen(
                            accent = state.accent,
                            onAccent = { state.accent = it },
                            pace = state.trip.pace,
                            onPace = { state.trip = state.trip.copy(pace = it) },
                            interests = state.interests,
                            onInterest = { name, on -> state.interests = if (on) state.interests + name else state.interests - name },
                        )
                    }
                    PillNavBar(
                        current = state.tab,
                        onSelect = { state.tab = it },
                        modifier = Modifier.align(Alignment.BottomCenter),
                    )
                }
                is Detail.PlaceDetail -> PlaceScreen(
                    place = state.catalog[detail.placeId],
                    trip = state.trip,
                    onBack = { state.back() },
                )
                Detail.Check -> CheckScreen(
                    trip = state.trip,
                    catalog = state.catalog,
                    report = report,
                    dismissed = state.dismissed,
                    lastApplied = state.lastApplied,
                    onApply = { applyFix(it) },
                    onKeep = { state.dismissed = state.dismissed + it.id },
                    onBack = {
                        state.lastApplied = null
                        state.back()
                    },
                )
            }
        }
    }
}
