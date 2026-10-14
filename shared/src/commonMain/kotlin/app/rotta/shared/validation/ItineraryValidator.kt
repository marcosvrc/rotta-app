package app.rotta.shared.validation

import app.rotta.shared.format.Format
import app.rotta.shared.model.DayPlan
import app.rotta.shared.model.PlaceCatalog
import app.rotta.shared.model.Stop
import app.rotta.shared.model.TimeOfDay
import app.rotta.shared.model.Trip
import app.rotta.shared.travel.TravelEstimator
import kotlin.math.max
import kotlin.math.min

enum class Severity { CRITICA, ATENCAO }

enum class IssueKind(val label: String) {
    FECHADO("Fechado"),
    HORARIO("Horário"),
    DESLOCAMENTO("Deslocamento"),
    CLIMA("Clima"),
    RITMO("Ritmo"),
}

/** Correção que o plano B propõe. Aplicar é sempre uma escolha do usuário. */
sealed interface Fix {
    data class MoveStop(val fromDay: Int, val placeId: String, val toDay: Int, val newStart: TimeOfDay) : Fix
    data class ReplaceStop(val day: Int, val placeId: String, val newPlaceId: String, val durationMinutes: Int) : Fix
    data class RemoveStop(val day: Int, val placeId: String) : Fix
    data class ShiftStops(val day: Int, val fromIndex: Int, val minutes: Int) : Fix
}

data class Issue(
    val id: String,
    val kind: IssueKind,
    val severity: Severity,
    val dayIndex: Int,
    val placeId: String?,
    val title: String,
    val detail: String,
    val fixDescription: String?,
    val fix: Fix?,
)

data class ValidationReport(
    val issues: List<Issue>,
    val checkedStops: Int,
    val passedChecks: List<String>,
) {
    val critical: Int get() = issues.count { it.severity == Severity.CRITICA }
    val warnings: Int get() = issues.count { it.severity == Severity.ATENCAO }

    /** 100 é um roteiro sem pendências. */
    val score: Int get() = max(0, 100 - 12 * critical - 6 * warnings)
}

/**
 * Confere o roteiro com regras determinísticas: lugar fechado, horário,
 * deslocamento, clima e ritmo. A IA só entra para explicar ou sugerir;
 * a checagem em si é sempre feita aqui, em código.
 */
class ItineraryValidator(private val catalog: PlaceCatalog) {

    fun validate(trip: Trip): ValidationReport {
        val issues = mutableListOf<Issue>()
        trip.days.forEachIndexed { dayIndex, day ->
            val weekday = day.date.weekday
            day.stops.forEachIndexed stops@{ stopIndex, stop ->
                val place = catalog[stop.placeId]
                if (!place.hours.isOpenOn(weekday)) {
                    issues += closedIssue(trip, dayIndex, stop)
                    return@stops
                }
                if (stop.start < place.hours.opens) {
                    val wait = place.hours.opens - stop.start
                    issues += Issue(
                        id = "${IssueKind.HORARIO}-$dayIndex-${stop.placeId}",
                        kind = IssueKind.HORARIO,
                        severity = Severity.ATENCAO,
                        dayIndex = dayIndex,
                        placeId = stop.placeId,
                        title = "${place.name} ainda estará fechado",
                        detail = "A visita começa às ${stop.start.label}, mas o lugar só abre às ${place.hours.opens.label}.",
                        fixDescription = "Adiar esta parada e as seguintes em ${Format.duration(wait)}.",
                        fix = Fix.ShiftStops(dayIndex, stopIndex, wait),
                    )
                } else if (stop.end > place.hours.closes) {
                    issues += Issue(
                        id = "${IssueKind.HORARIO}-$dayIndex-${stop.placeId}",
                        kind = IssueKind.HORARIO,
                        severity = Severity.ATENCAO,
                        dayIndex = dayIndex,
                        placeId = stop.placeId,
                        title = "${place.name} fecha antes do fim da visita",
                        detail = "O lugar fecha às ${place.hours.closes.label} e a visita vai até ${stop.end.label}.",
                        fixDescription = null,
                        fix = null,
                    )
                }
                if (day.rainExpected && !place.indoor) {
                    issues += rainIssue(trip, dayIndex, stop)
                }
            }
            issues += transferIssues(dayIndex, day)
            loadIssue(trip, dayIndex, day)?.let { issues += it }
        }
        val sorted = issues.sortedWith(compareBy<Issue>({ it.severity.ordinal }, { it.dayIndex }))
        return ValidationReport(sorted, trip.stopCount, passedChecks(trip, sorted))
    }

    /** Minutos de visitas mais deslocamentos no dia. */
    fun dayLoadMinutes(day: DayPlan): Int =
        day.stops.sumOf { it.durationMinutes } +
            day.stops.zipWithNext { a, b -> legMinutes(a.placeId, b.placeId) }.sum()

    fun apply(trip: Trip, fix: Fix): Trip = when (fix) {
        is Fix.MoveStop -> {
            val stop = trip.days[fix.fromDay].stops.first { it.placeId == fix.placeId }
            trip.updateDay(fix.fromDay) { day -> day.copy(stops = day.stops.filterNot { it.placeId == fix.placeId }) }
                .updateDay(fix.toDay) { day -> day.copy(stops = day.stops + stop.copy(start = fix.newStart)) }
        }
        is Fix.ReplaceStop -> trip.updateDay(fix.day) { day ->
            day.copy(
                stops = day.stops.map {
                    if (it.placeId == fix.placeId) it.copy(placeId = fix.newPlaceId, durationMinutes = fix.durationMinutes) else it
                },
            )
        }
        is Fix.RemoveStop -> trip.updateDay(fix.day) { day ->
            day.copy(stops = day.stops.filterNot { it.placeId == fix.placeId })
        }
        is Fix.ShiftStops -> trip.updateDay(fix.day) { day ->
            day.copy(
                stops = day.stops.mapIndexed { i, s -> if (i >= fix.fromIndex) s.copy(start = s.start + fix.minutes) else s },
            )
        }
    }

    private fun closedIssue(trip: Trip, dayIndex: Int, stop: Stop): Issue {
        val place = catalog[stop.placeId]
        val day = trip.days[dayIndex]
        // Dia mais leve em que o lugar abre e há uma janela livre: (carga, dia, horário).
        val target: Triple<Int, Int, TimeOfDay>? = trip.days
            .mapIndexedNotNull { otherIndex, other ->
                if (otherIndex == dayIndex || !place.hours.isOpenOn(other.date.weekday)) return@mapIndexedNotNull null
                val slot = findSlot(other, stop.durationMinutes, place.hours.opens, place.hours.closes)
                    ?: return@mapIndexedNotNull null
                Triple(dayLoadMinutes(other), otherIndex, slot)
            }
            .minByOrNull { it.first }
        val fix = target?.let { Fix.MoveStop(dayIndex, stop.placeId, it.second, it.third) }
        val fixText = target?.let {
            val targetDay = trip.days[it.second]
            "Mover para o dia ${it.second + 1} (${targetDay.date.weekday.longLabel}), às ${it.third.label}, onde há uma janela livre."
        }
        return Issue(
            id = "${IssueKind.FECHADO}-$dayIndex-${stop.placeId}",
            kind = IssueKind.FECHADO,
            severity = Severity.CRITICA,
            dayIndex = dayIndex,
            placeId = stop.placeId,
            title = place.name,
            detail = "O lugar não abre ${day.date.weekday.everyLabel}.",
            fixDescription = fixText,
            fix = fix,
        )
    }

    private fun rainIssue(trip: Trip, dayIndex: Int, stop: Stop): Issue {
        val place = catalog[stop.placeId]
        val day = trip.days[dayIndex]
        val weekday = day.date.weekday
        val candidate = catalog.all
            .asSequence()
            .filter { it.indoor && !trip.containsPlace(it.id) && it.hours.isOpenOn(weekday) && stop.start >= it.hours.opens }
            .map { it to min(it.suggestedMinutes, min(it.hours.closes - stop.start, day.availableUntil - stop.start)) }
            .filter { (_, duration) -> duration >= MIN_VISIT_MINUTES }
            .minByOrNull { (alt, _) -> TravelEstimator.distanceKm(place.location, alt.location) }
        val fix = candidate?.let { (alt, duration) -> Fix.ReplaceStop(dayIndex, stop.placeId, alt.id, duration) }
        val fixText = candidate?.let { (alt, _) ->
            val leg = TravelEstimator.leg(place.location, alt.location)
            "Trocar por ${alt.name}, coberto e a ${leg.minutes} min ${leg.mode.label}."
        }
        return Issue(
            id = "${IssueKind.CLIMA}-$dayIndex-${stop.placeId}",
            kind = IssueKind.CLIMA,
            severity = Severity.ATENCAO,
            dayIndex = dayIndex,
            placeId = stop.placeId,
            title = "Chuva prevista em ${place.name}",
            detail = "Parada ao ar livre às ${stop.start.label}, num dia com chuva prevista.",
            fixDescription = fixText,
            fix = fix,
        )
    }

    private fun transferIssues(dayIndex: Int, day: DayPlan): List<Issue> =
        day.stops.zipWithNext().mapIndexedNotNull { i, (a, b) ->
            val from = catalog[a.placeId]
            val to = catalog[b.placeId]
            val leg = TravelEstimator.leg(from.location, to.location)
            val gap = b.start - a.end
            if (gap >= leg.minutes) return@mapIndexedNotNull null
            val missing = roundUpTo5(leg.minutes - gap)
            Issue(
                id = "${IssueKind.DESLOCAMENTO}-$dayIndex-${b.placeId}",
                kind = IssueKind.DESLOCAMENTO,
                severity = Severity.ATENCAO,
                dayIndex = dayIndex,
                placeId = b.placeId,
                title = "Não dá tempo de chegar a ${to.name}",
                detail = "São cerca de ${leg.minutes} min ${leg.mode.label} desde ${from.name}, e o intervalo é de ${max(gap, 0)} min.",
                fixDescription = "Adiar ${to.name} e as paradas seguintes em ${Format.duration(missing)}.",
                fix = Fix.ShiftStops(dayIndex, i + 1, missing),
            )
        }

    private fun loadIssue(trip: Trip, dayIndex: Int, day: DayPlan): Issue? {
        val load = dayLoadMinutes(day)
        if (load <= trip.pace.maxMinutesPerDay || day.stops.size < 2) return null
        val lightest = day.stops.minWith(
            compareBy<Stop>({ catalog[it.placeId].priority }, { -it.durationMinutes }),
        )
        val place = catalog[lightest.placeId]
        return Issue(
            id = "${IssueKind.RITMO}-$dayIndex",
            kind = IssueKind.RITMO,
            severity = Severity.ATENCAO,
            dayIndex = dayIndex,
            placeId = null,
            title = "Dia pesado: ${Format.duration(load)} de programação",
            detail = "O ritmo ${trip.pace.label.lowercase()} prevê até ${Format.duration(trip.pace.maxMinutesPerDay)} por dia, contando os deslocamentos.",
            fixDescription = "Tirar ${place.name} e deixar o dia mais leve.",
            fix = Fix.RemoveStop(dayIndex, lightest.placeId),
        )
    }

    /** Primeiro horário (de 15 em 15 min) com folga de 30 min para as outras paradas. */
    private fun findSlot(day: DayPlan, duration: Int, opens: TimeOfDay, closes: TimeOfDay): TimeOfDay? {
        val limit = min(closes.minutes, day.availableUntil.minutes)
        var t = max(opens.minutes, day.availableFrom.minutes)
        while (t + duration <= limit) {
            val free = day.stops.all { s ->
                t + duration + BUFFER_MINUTES <= s.start.minutes || t >= s.end.minutes + BUFFER_MINUTES
            }
            if (free) return TimeOfDay(t)
            t += 15
        }
        return null
    }

    private fun passedChecks(trip: Trip, issues: List<Issue>): List<String> {
        val kinds = issues.map { it.kind }.toSet()
        val result = mutableListOf<String>()
        if (IssueKind.FECHADO !in kinds && IssueKind.HORARIO !in kinds) {
            result += "Horários de abertura conferidos nas ${trip.stopCount} paradas"
        }
        if (IssueKind.DESLOCAMENTO !in kinds) {
            result += "Os deslocamentos cabem entre as paradas"
        }
        val lightDays = trip.days.count { dayLoadMinutes(it) <= trip.pace.maxMinutesPerDay }
        result += "Ritmo dentro do combinado em $lightDays de ${trip.days.size} dias"
        if (IssueKind.CLIMA !in kinds) {
            result += "Nenhuma parada ao ar livre em dia de chuva"
        }
        return result
    }

    private fun legMinutes(fromId: String, toId: String): Int =
        TravelEstimator.leg(catalog[fromId].location, catalog[toId].location).minutes

    private fun roundUpTo5(minutes: Int): Int = ((minutes + 4) / 5) * 5

    private companion object {
        const val BUFFER_MINUTES = 30
        const val MIN_VISIT_MINUTES = 45
    }
}
