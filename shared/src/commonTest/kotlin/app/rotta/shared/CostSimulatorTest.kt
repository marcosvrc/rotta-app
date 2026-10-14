package app.rotta.shared

import app.rotta.shared.cost.CostCategory
import app.rotta.shared.cost.CostInput
import app.rotta.shared.cost.CostSimulator
import app.rotta.shared.cost.FoodLevel
import app.rotta.shared.cost.StayLevel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CostSimulatorTest {

    private fun lisboa(travelers: Int, stay: StayLevel = StayLevel.CONFORTO) =
        CostSimulator.estimate(CostInput(travelers, nights = 4, days = 5, stay = stay, food = FoodLevel.MEDIA))

    @Test
    fun coupleInComfort() {
        val estimate = lisboa(2)
        assertEquals(listOf(8400, 2560, 2600, 1300, 550), estimate.lines.map { it.valueBrl })
        assertEquals(15_410, estimate.totalBrl)
        assertEquals(7_705, estimate.perPersonBrl)
        assertFalse(estimate.against(18_000).overBudget)
        assertEquals(2_590, estimate.against(18_000).differenceBrl)
    }

    @Test
    fun luxuryGoesOverBudget() {
        val status = lisboa(2, StayLevel.LUXO).against(18_000)
        assertTrue(status.overBudget)
        assertEquals(-50, status.differenceBrl)
    }

    @Test
    fun threeTravelersNeedTwoRooms() {
        val estimate = lisboa(3)
        val stay = estimate.lines.first { it.category == CostCategory.HOSPEDAGEM }
        assertEquals(640 * 4 * 2, stay.valueBrl)
    }

    @Test
    fun sharesAddUpToOne() {
        val estimate = lisboa(2)
        val sum = CostCategory.entries.sumOf { estimate.share(it) }
        assertEquals(1.0, sum, 1e-9)
    }
}
