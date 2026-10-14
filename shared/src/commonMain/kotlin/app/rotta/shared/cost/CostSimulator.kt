package app.rotta.shared.cost

enum class StayLevel(val label: String, val nightlyPerRoomBrl: Int) {
    ECONOMICA("Econômica", 380),
    CONFORTO("Conforto", 640),
    LUXO("Luxo", 1300),
}

enum class FoodLevel(val label: String, val dailyPerPersonBrl: Int) {
    ECONOMICA("Econômica", 160),
    MEDIA("Média", 260),
    ALTA("Alta", 450),
}

enum class CostCategory(val label: String) {
    PASSAGENS("Passagens"),
    HOSPEDAGEM("Hospedagem"),
    ALIMENTACAO("Alimentação"),
    PASSEIOS("Passeios"),
    TRANSPORTE_LOCAL("Transporte local"),
}

/** Valores de referência por destino. Os de Lisboa são exemplos, não cotações. */
data class CostInput(
    val travelers: Int,
    val nights: Int,
    val days: Int,
    val stay: StayLevel,
    val food: FoodLevel,
    val flightPerPersonBrl: Int = 4200,
    val toursPerDayPerPersonBrl: Int = 130,
    val localTransportPerDayPerPersonBrl: Int = 55,
) {
    init {
        require(travelers >= 1) { "É preciso pelo menos 1 viajante" }
        require(nights >= 0 && days >= 1)
    }
}

data class CostLine(val category: CostCategory, val valueBrl: Int)

data class CostEstimate(val lines: List<CostLine>, val travelers: Int) {
    val totalBrl: Int get() = lines.sumOf { it.valueBrl }
    val perPersonBrl: Int get() = totalBrl / travelers

    fun share(category: CostCategory): Double {
        val total = totalBrl
        if (total == 0) return 0.0
        return (lines.firstOrNull { it.category == category }?.valueBrl ?: 0).toDouble() / total
    }

    fun against(budgetBrl: Int): BudgetStatus = BudgetStatus(budgetBrl, totalBrl)
}

data class BudgetStatus(val budgetBrl: Int, val totalBrl: Int) {
    val overBudget: Boolean get() = totalBrl > budgetBrl
    /** Positivo: sobra. Negativo: falta. */
    val differenceBrl: Int get() = budgetBrl - totalBrl
}

object CostSimulator {
    fun estimate(input: CostInput): CostEstimate {
        val rooms = (input.travelers + 1) / 2
        val lines = listOf(
            CostLine(CostCategory.PASSAGENS, input.flightPerPersonBrl * input.travelers),
            CostLine(CostCategory.HOSPEDAGEM, input.stay.nightlyPerRoomBrl * input.nights * rooms),
            CostLine(CostCategory.ALIMENTACAO, input.food.dailyPerPersonBrl * input.days * input.travelers),
            CostLine(CostCategory.PASSEIOS, input.toursPerDayPerPersonBrl * input.days * input.travelers),
            CostLine(CostCategory.TRANSPORTE_LOCAL, input.localTransportPerDayPerPersonBrl * input.days * input.travelers),
        )
        return CostEstimate(lines, input.travelers)
    }
}
