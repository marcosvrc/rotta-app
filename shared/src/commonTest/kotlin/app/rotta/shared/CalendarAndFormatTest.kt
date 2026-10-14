package app.rotta.shared

import app.rotta.shared.format.Format
import app.rotta.shared.model.OpeningHours
import app.rotta.shared.model.TimeOfDay
import app.rotta.shared.model.TripDate
import app.rotta.shared.model.Weekday
import app.rotta.shared.travel.TravelEstimator
import app.rotta.shared.travel.TravelMode
import app.rotta.shared.sample.LisboaSample
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CalendarAndFormatTest {

    @Test
    fun weekdayOfKnownDates() {
        assertEquals(Weekday.SEXTA, TripDate(2026, 11, 13).weekday)
        assertEquals(Weekday.QUINTA, TripDate(2026, 1, 1).weekday)
        assertEquals(Weekday.SEGUNDA, TripDate(2026, 11, 16).weekday)
        assertEquals(Weekday.SABADO, TripDate(2000, 1, 1).weekday)
    }

    @Test
    fun plusDaysCrossesMonthAndLeapYear() {
        assertEquals(TripDate(2026, 12, 1), TripDate(2026, 11, 30).plusDays(1))
        assertEquals(TripDate(2028, 2, 29), TripDate(2028, 2, 28).plusDays(1))
        assertEquals(TripDate(2027, 1, 2), TripDate(2026, 12, 31).plusDays(2))
    }

    @Test
    fun labels() {
        assertEquals("Sex, 13 nov", TripDate(2026, 11, 13).shortLabel)
        assertEquals("12 a 16 de nov", TripDate.rangeLabel(TripDate(2026, 11, 12), TripDate(2026, 11, 16)))
        assertEquals("09:05", TimeOfDay.of(9, 5).label)
    }

    @Test
    fun formatsMoneyDistanceAndDuration() {
        assertEquals("R$ 15.410", Format.brl(15_410))
        assertEquals("R$ 950", Format.brl(950))
        assertEquals("R$ 1.234.567", Format.brl(1_234_567))
        assertEquals("-R$ 50", Format.brl(-50))
        assertEquals("900 m", Format.distance(0.92))
        assertEquals("6,5 km", Format.distance(6.46))
        assertEquals("3 km", Format.distance(3.01))
        assertEquals("45 min", Format.duration(45))
        assertEquals("2h", Format.duration(120))
        assertEquals("8h31", Format.duration(511))
    }

    @Test
    fun openingHours() {
        val hours = OpeningHours(TimeOfDay.of(10), TimeOfDay.of(17, 30), setOf(Weekday.SEGUNDA))
        assertFalse(hours.isOpenOn(Weekday.SEGUNDA))
        assertTrue(hours.fits(Weekday.TERCA, TimeOfDay.of(10), 60))
        assertFalse(hours.fits(Weekday.TERCA, TimeOfDay.of(17), 60))
        assertEquals("10:00 às 17:30 · fechado às segundas", hours.label)
    }

    @Test
    fun travelEstimates() {
        val c = LisboaSample.catalog
        val walk = TravelEstimator.leg(c["torre"].location, c["jeronimos"].location)
        assertEquals(TravelMode.A_PE, walk.mode)
        assertEquals(18, walk.minutes)
        val transit = TravelEstimator.leg(c["pasteis"].location, c["lxfactory"].location)
        assertEquals(TravelMode.TRANSPORTE, transit.mode)
        assertEquals(17, transit.minutes)
    }
}
