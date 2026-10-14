package app.rotta.shared.format

import kotlin.math.abs
import kotlin.math.roundToInt

object Format {
    /** Ex.: 15410 -> "R$ 15.410". */
    fun brl(value: Int): String = (if (value < 0) "-R$ " else "R$ ") + thousands(abs(value))

    /** Ex.: 6.5 -> "6,5 km"; 0.92 -> "900 m". */
    fun distance(km: Double): String =
        if (km < 1.0) {
            val meters = ((km * 1000) / 50).roundToInt() * 50
            "${meters.coerceAtLeast(50)} m"
        } else {
            val tenths = (km * 10).roundToInt()
            val whole = tenths / 10
            val decimal = tenths % 10
            if (decimal == 0) "$whole km" else "$whole,$decimal km"
        }

    /** Ex.: 45 -> "45 min"; 120 -> "2h"; 511 -> "8h31". */
    fun duration(minutes: Int): String {
        if (minutes < 60) return "$minutes min"
        val h = minutes / 60
        val m = minutes % 60
        return if (m == 0) "${h}h" else "${h}h${m.toString().padStart(2, '0')}"
    }

    private fun thousands(value: Int): String {
        val digits = value.toString()
        val out = StringBuilder()
        digits.forEachIndexed { index, c ->
            if (index > 0 && (digits.length - index) % 3 == 0) out.append('.')
            out.append(c)
        }
        return out.toString()
    }
}
