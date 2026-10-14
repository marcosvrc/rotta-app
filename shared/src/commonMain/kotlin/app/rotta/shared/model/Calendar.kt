package app.rotta.shared.model

/** Dia da semana, com os textos usados nas telas em português. */
enum class Weekday(val shortLabel: String, val longLabel: String, val everyLabel: String) {
    SEGUNDA("Seg", "segunda", "às segundas"),
    TERCA("Ter", "terça", "às terças"),
    QUARTA("Qua", "quarta", "às quartas"),
    QUINTA("Qui", "quinta", "às quintas"),
    SEXTA("Sex", "sexta", "às sextas"),
    SABADO("Sáb", "sábado", "aos sábados"),
    DOMINGO("Dom", "domingo", "aos domingos"),
}

/** Horário do dia em minutos desde a meia-noite (0 a 1440). */
data class TimeOfDay(val minutes: Int) : Comparable<TimeOfDay> {
    init {
        require(minutes in 0..MINUTES_IN_DAY) { "Horário fora do dia: $minutes" }
    }

    val label: String
        get() {
            val h = minutes / 60
            val m = minutes % 60
            return "${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}"
        }

    operator fun plus(extra: Int): TimeOfDay = TimeOfDay((minutes + extra).coerceAtMost(MINUTES_IN_DAY))

    operator fun minus(other: TimeOfDay): Int = minutes - other.minutes

    override fun compareTo(other: TimeOfDay): Int = minutes.compareTo(other.minutes)

    override fun toString(): String = label

    companion object {
        const val MINUTES_IN_DAY = 24 * 60
        fun of(hour: Int, minute: Int = 0): TimeOfDay = TimeOfDay(hour * 60 + minute)
        val START_OF_DAY = TimeOfDay(0)
        val END_OF_DAY = TimeOfDay(MINUTES_IN_DAY)
    }
}

/** Data simples do calendário gregoriano, sem depender de bibliotecas de data. */
data class TripDate(val year: Int, val month: Int, val day: Int) : Comparable<TripDate> {
    init {
        require(month in 1..12) { "Mês inválido: $month" }
        require(day in 1..daysInMonth(year, month)) { "Dia inválido: $day/$month/$year" }
    }

    val weekday: Weekday
        get() {
            val t = intArrayOf(0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4)
            val y = if (month < 3) year - 1 else year
            val w = (y + y / 4 - y / 100 + y / 400 + t[month - 1] + day) % 7 // 0 = domingo
            return when (w) {
                0 -> Weekday.DOMINGO
                1 -> Weekday.SEGUNDA
                2 -> Weekday.TERCA
                3 -> Weekday.QUARTA
                4 -> Weekday.QUINTA
                5 -> Weekday.SEXTA
                else -> Weekday.SABADO
            }
        }

    /** Ex.: "Sex, 13 nov". */
    val shortLabel: String get() = "${weekday.shortLabel}, $day ${MONTHS[month - 1]}"

    fun plusDays(days: Int): TripDate {
        require(days >= 0)
        var y = year
        var m = month
        var d = day + days
        while (d > daysInMonth(y, m)) {
            d -= daysInMonth(y, m)
            m += 1
            if (m > 12) {
                m = 1
                y += 1
            }
        }
        return TripDate(y, m, d)
    }

    override fun compareTo(other: TripDate): Int =
        compareValuesBy(this, other, { it.year }, { it.month }, { it.day })

    companion object {
        val MONTHS = listOf("jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez")

        fun isLeapYear(year: Int): Boolean = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0

        fun daysInMonth(year: Int, month: Int): Int = when (month) {
            2 -> if (isLeapYear(year)) 29 else 28
            4, 6, 9, 11 -> 30
            else -> 31
        }

        /** Ex.: "12 a 16 de nov". */
        fun rangeLabel(start: TripDate, end: TripDate): String =
            if (start.month == end.month) {
                "${start.day} a ${end.day} de ${MONTHS[end.month - 1]}"
            } else {
                "${start.day} ${MONTHS[start.month - 1]} a ${end.day} ${MONTHS[end.month - 1]}"
            }
    }
}
