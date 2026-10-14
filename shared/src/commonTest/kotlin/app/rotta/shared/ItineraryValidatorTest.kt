package app.rotta.shared

import app.rotta.shared.model.Stop
import app.rotta.shared.model.TimeOfDay
import app.rotta.shared.sample.LisboaSample
import app.rotta.shared.validation.Fix
import app.rotta.shared.validation.IssueKind
import app.rotta.shared.validation.ItineraryValidator
import app.rotta.shared.validation.Severity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ItineraryValidatorTest {
    private val validator = ItineraryValidator(LisboaSample.catalog)

    @Test
    fun sampleTripHasThreeKnownIssues() {
        val report = validator.validate(LisboaSample.trip())
        assertEquals(listOf(IssueKind.FECHADO, IssueKind.CLIMA, IssueKind.RITMO), report.issues.map { it.kind })
        assertEquals(1, report.critical)
        assertEquals(2, report.warnings)
        assertEquals(100 - 12 - 12, report.score)
        assertEquals(Severity.CRITICA, report.issues.first().severity)
    }

    @Test
    fun closedMuseumMovesToSaturdayAfternoon() {
        val issue = validator.validate(LisboaSample.trip()).issues.first { it.kind == IssueKind.FECHADO }
        assertEquals(4, issue.dayIndex)
        assertEquals("azulejo", issue.placeId)
        val fix = assertIs<Fix.MoveStop>(issue.fix)
        assertEquals(2, fix.toDay)
        assertEquals(TimeOfDay.of(14, 45), fix.newStart)
        assertEquals("Mover para o dia 3 (sábado), às 14:45, onde há uma janela livre.", issue.fixDescription)
    }

    @Test
    fun rainSuggestsNearestIndoorPlace() {
        val issue = validator.validate(LisboaSample.trip()).issues.first { it.kind == IssueKind.CLIMA }
        val fix = assertIs<Fix.ReplaceStop>(issue.fix)
        assertEquals("stcatarina", fix.placeId)
        assertEquals("mnaa", fix.newPlaceId)
        assertEquals(60, fix.durationMinutes)
        assertEquals("Trocar por Museu Nacional de Arte Antiga, coberto e a 21 min a pé.", issue.fixDescription)
    }

    @Test
    fun heavyDayDropsLowestPriorityStop() {
        val trip = LisboaSample.trip()
        assertEquals(511, validator.dayLoadMinutes(trip.days[3]))
        val issue = validator.validate(trip).issues.first { it.kind == IssueKind.RITMO }
        assertEquals("Dia pesado: 8h31 de programação", issue.title)
        val fix = assertIs<Fix.RemoveStop>(issue.fix)
        assertEquals("sintra", fix.placeId)
    }

    @Test
    fun applyingEveryFixLeavesTheTripClean() {
        var trip = LisboaSample.trip()
        repeat(5) {
            val next = validator.validate(trip).issues.firstOrNull { it.fix != null } ?: return@repeat
            trip = validator.apply(trip, assertNotNull(next.fix))
        }
        val report = validator.validate(trip)
        assertTrue(report.issues.isEmpty(), "Ainda há pendências: ${report.issues.map { it.title }}")
        assertEquals(100, report.score)
        assertEquals(listOf("gulbenkian", "timeout", "azulejo", "mnaa"), trip.days[2].stops.map { it.placeId })
        assertEquals(listOf("oceanario"), trip.days[4].stops.map { it.placeId })
    }

    @Test
    fun detectsTightTransferAndShiftsFollowingStops() {
        val base = LisboaSample.trip()
        val tight = base.updateDay(1) { day ->
            day.copy(stops = day.stops.map { if (it.placeId == "jeronimos") it.copy(start = TimeOfDay.of(11, 5)) else it })
        }
        val issue = validator.validate(tight).issues.first { it.kind == IssueKind.DESLOCAMENTO }
        val fix = assertIs<Fix.ShiftStops>(issue.fix)
        assertEquals(1, fix.fromIndex)
        assertEquals(15, fix.minutes)
        val fixed = validator.apply(tight, fix)
        assertEquals(TimeOfDay.of(11, 20), fixed.days[1].stops[1].start)
        assertTrue(validator.validate(fixed).issues.none { it.kind == IssueKind.DESLOCAMENTO })
    }

    @Test
    fun detectsVisitBeforeOpening() {
        val early = LisboaSample.trip().updateDay(1) { day ->
            day.copy(stops = listOf(Stop("torre", TimeOfDay.of(9), 60)) + day.stops.drop(1))
        }
        val issue = validator.validate(early).issues.first { it.kind == IssueKind.HORARIO }
        val fix = assertIs<Fix.ShiftStops>(issue.fix)
        assertEquals(60, fix.minutes)
    }
}
