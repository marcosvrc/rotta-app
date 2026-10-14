package app.rotta.shared.travel

import app.rotta.shared.model.GeoPoint
import kotlin.math.asin
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin
import kotlin.math.sqrt

enum class TravelMode(val label: String) {
    A_PE("a pé"),
    TRANSPORTE("de transporte"),
    CARRO("de carro"),
}

data class Leg(val distanceKm: Double, val minutes: Int, val mode: TravelMode)

/**
 * Estimativa offline de deslocamento entre dois pontos.
 * No app final, a Routes API substitui esta conta quando houver rede.
 */
object TravelEstimator {
    private const val EARTH_RADIUS_KM = 6371.0
    private const val WALK_KMH = 4.8
    private const val TRANSIT_KMH = 20.0
    private const val CAR_KMH = 45.0

    fun distanceKm(a: GeoPoint, b: GeoPoint): Double {
        val lat1 = a.lat.toRadians()
        val lat2 = b.lat.toRadians()
        val dLat = (b.lat - a.lat).toRadians()
        val dLng = (b.lng - a.lng).toRadians()
        val h = sin(dLat / 2) * sin(dLat / 2) + cos(lat1) * cos(lat2) * sin(dLng / 2) * sin(dLng / 2)
        return 2 * EARTH_RADIUS_KM * asin(sqrt(h))
    }

    fun leg(from: GeoPoint, to: GeoPoint): Leg {
        val d = distanceKm(from, to)
        return when {
            d <= 1.5 -> Leg(d, max(1, ceilMinutes(d * 1.3 / WALK_KMH)), TravelMode.A_PE)
            d <= 15.0 -> Leg(d, 8 + ceilMinutes(d * 1.3 / TRANSIT_KMH), TravelMode.TRANSPORTE)
            else -> Leg(d, 10 + ceilMinutes(d * 1.2 / CAR_KMH), TravelMode.CARRO)
        }
    }

    private fun ceilMinutes(hours: Double): Int = ceil(hours * 60).toInt()

    private fun Double.toRadians(): Double = this * kotlin.math.PI / 180.0
}
