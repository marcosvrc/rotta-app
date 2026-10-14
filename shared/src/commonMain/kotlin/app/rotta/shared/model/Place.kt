package app.rotta.shared.model

data class GeoPoint(val lat: Double, val lng: Double)

enum class PlaceKind(val label: String) {
    MONUMENTO("Monumento"),
    MUSEU("Museu"),
    MERCADO("Mercado"),
    DOCERIA("Doceria"),
    RESTAURANTE("Restaurante"),
    MIRANTE("Mirante"),
    BAIRRO("Bairro"),
    PALACIO("Palácio"),
    AQUARIO("Aquário"),
    CENTRO_CRIATIVO("Centro criativo"),
}

/** Horário de funcionamento. [closes] pode ser 24:00 para "até a meia-noite". */
data class OpeningHours(
    val opens: TimeOfDay,
    val closes: TimeOfDay,
    val closedOn: Set<Weekday> = emptySet(),
) {
    val alwaysOpen: Boolean
        get() = opens == TimeOfDay.START_OF_DAY && closes == TimeOfDay.END_OF_DAY && closedOn.isEmpty()

    fun isOpenOn(day: Weekday): Boolean = day !in closedOn

    fun fits(day: Weekday, start: TimeOfDay, durationMinutes: Int): Boolean =
        isOpenOn(day) && start >= opens && start.minutes + durationMinutes <= closes.minutes

    /** Ex.: "10:00 às 17:30 · fechado às segundas". */
    val label: String
        get() {
            if (alwaysOpen) return "Aberto o tempo todo"
            val base = if (closes == TimeOfDay.END_OF_DAY) "${opens.label} à meia-noite" else "${opens.label} às ${closes.label}"
            if (closedOn.isEmpty()) return "$base · todos os dias"
            val closed = Weekday.entries.filter { it in closedOn }.joinToString(" e ") { it.everyLabel }
            return "$base · fechado $closed"
        }

    companion object {
        val ALWAYS = OpeningHours(TimeOfDay.START_OF_DAY, TimeOfDay.END_OF_DAY)
    }
}

data class Place(
    val id: String,
    val name: String,
    val kind: PlaceKind,
    val neighborhood: String,
    val location: GeoPoint,
    /** Coberto: serve de plano B quando chove. */
    val indoor: Boolean,
    val hours: OpeningHours,
    val suggestedMinutes: Int,
    /** 1 (pode sair do roteiro) a 5 (imperdível). */
    val priority: Int,
    val story: String,
    val tips: List<String>,
    val sourceUrl: String? = null,
)

class PlaceCatalog(places: List<Place>) {
    private val byId: Map<String, Place> = places.associateBy { it.id }

    val all: List<Place> = places

    operator fun get(id: String): Place = byId[id] ?: error("Lugar desconhecido: $id")

    fun find(id: String): Place? = byId[id]
}
