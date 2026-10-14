package app.rotta.shared.model

data class Stop(
    val placeId: String,
    val start: TimeOfDay,
    val durationMinutes: Int,
) {
    val end: TimeOfDay get() = start + durationMinutes
}

data class DayPlan(
    val date: TripDate,
    val title: String,
    val stops: List<Stop>,
    /** Primeiro horário livre no dia (ex.: depois do check-in). */
    val availableFrom: TimeOfDay = TimeOfDay.of(8),
    /** Último horário livre no dia (ex.: antes do voo de volta). */
    val availableUntil: TimeOfDay = TimeOfDay.of(23),
    val rainExpected: Boolean = false,
) {
    fun sorted(): DayPlan = copy(stops = stops.sortedBy { it.start })
}

enum class Pace(val label: String, val maxMinutesPerDay: Int) {
    LEVE("Leve", 6 * 60),
    MEDIO("Médio", 8 * 60),
    INTENSO("Intenso", 10 * 60),
}

data class Trip(
    val id: String,
    val destination: String,
    val country: String,
    val days: List<DayPlan>,
    val travelers: Int,
    val budgetBrl: Int,
    val pace: Pace,
) {
    val start: TripDate get() = days.first().date
    val end: TripDate get() = days.last().date
    val nights: Int get() = days.size - 1
    val dateRangeLabel: String get() = TripDate.rangeLabel(start, end)
    val stopCount: Int get() = days.sumOf { it.stops.size }

    fun dayIndexOf(placeId: String): Int? =
        days.indexOfFirst { day -> day.stops.any { it.placeId == placeId } }.takeIf { it >= 0 }

    fun containsPlace(placeId: String): Boolean = dayIndexOf(placeId) != null

    fun updateDay(index: Int, transform: (DayPlan) -> DayPlan): Trip =
        copy(days = days.mapIndexed { i, day -> if (i == index) transform(day).sorted() else day })
}
