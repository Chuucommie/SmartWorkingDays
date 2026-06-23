package com.eosprod.smartworkingdays.models

import java.util.UUID

// ── DayState ──

enum class DayState(val label: String, val icon: String) {
    FREE("Libero", "◌"),
    SW("SW", "🏠"),
    OFFICE("Ufficio", "🏢"),
    ABSENT("Assenza", "✕"),
    HALF("Misto", "◐");

    val isWorkingDay: Boolean get() = this != ABSENT
}

typealias WeekPlan = List<DayState>

// ── SwRule ──

sealed class SwRule {
    abstract val description: String
    abstract fun computeTarget(workedDays: Int): Pair<Double, Double>

    data class Percentage(val value: Double) : SwRule() {
        override val description: String get() = "${value.toInt()}% Smart Working"
        override fun computeTarget(workedDays: Int): Pair<Double, Double> {
            val raw = (value / 100.0) * workedDays
            val rounded = Math.round(raw * 2) / 2.0
            val sw = minOf(rounded, workedDays.toDouble())
            return sw to (workedDays - sw)
        }
    }

    data class Fixed(val value: Double) : SwRule() {
        override val description: String get() = "Max ${value.toInt()} giorni SW"
        override fun computeTarget(workedDays: Int): Pair<Double, Double> {
            val sw = minOf(value, workedDays.toDouble())
            return sw to (workedDays - sw)
        }
    }
}

// ── Permutation ──

data class Permutation(
    val id: String = UUID.randomUUID().toString(),
    val week: WeekPlan,
    val totalSW: Int,
    val totalOffice: Int,
    val totalHalf: Int,
    val valid: Boolean,
    val adherence: Double
) {
    val swCount: Double get() = totalSW + totalHalf / 2.0
}

// ── Timesheet Types ──

enum class TimesheetStatus(val label: String, val colorHex: String) {
    OPEN("Aperto", "#007AFF"),
    PENDING_APPROVAL("In approvazione", "#FF9500"),
    APPROVED("Approvato", "#34C759"),
    REJECTED("Respinto", "#FF3B30");
}

enum class LineType(val label: String) {
    RESOURCE("Risorsa"),
    ITEM("Articolo"),
    GL_ACCOUNT("C/G");
}

enum class UnitOfMeasure(val label: String) {
    HOURS("Ore"),
    DAYS("Giorni");
}

data class TimesheetLine(
    val id: String = UUID.randomUUID().toString(),
    val timesheetId: String = "",
    var lineNo: Int = 0,
    var type: LineType = LineType.RESOURCE,
    var no: String = "",
    var description: String = "",
    var quantity: Double = 0.0,
    var unitOfMeasure: UnitOfMeasure = UnitOfMeasure.HOURS,
    var jobNo: String = "",
    var workType: String = "",
    var chargeable: Boolean = true,
    var locationCode: String = "",
    var dayIndex: Int = 0
)

data class TimesheetHeader(
    val id: String = UUID.randomUUID().toString(),
    var no: String = "",
    val resourceNo: String,
    val resourceName: String,
    var status: TimesheetStatus = TimesheetStatus.OPEN,
    val startingDate: String,
    val endingDate: String,
    val weekNo: Int,
    val periodType: String = "Week",
    var jobNo: String = "",
    var description: String = "",
    val createdAt: String = java.time.Instant.now().toString(),
    var updatedAt: String = java.time.Instant.now().toString()
)

data class Timesheet(
    val header: TimesheetHeader,
    val lines: MutableList<TimesheetLine> = mutableListOf()
) {
    val id: String get() = header.id
}

data class DaySummary(
    val dayIndex: Int,
    val dayName: String,
    val date: String,
    val lines: List<TimesheetLine>,
    val totalHours: Double
)

data class TimesheetStats(
    var totalHours: Double = 0.0,
    val byDay: MutableMap<Int, Double> = mutableMapOf(),
    val byWorkType: MutableMap<String, Double> = mutableMapOf(),
    val byJob: MutableMap<String, Double> = mutableMapOf()
)

// ── Saved Week ──

data class SavedWeek(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val week: WeekPlan,
    val totalSW: Int,
    val createdAt: Long = System.currentTimeMillis()
)

// ── User Profile ──

data class UserProfile(
    val employeeId: String = "EMP001",
    val employeeName: String = "Ricardo Quintero",
    val locationCode: String = "BOLOGNA"
)

// ── Field Labels (BC Italian) ──

object FieldLabels {
    const val RESOURCE_NO = "Nr. risorsa"
    const val RESOURCE_NAME = "Nome risorsa"
    const val STATUS = "Stato"
    const val WEEK_NO = "Nr. settimana"
    const val STARTING_DATE = "Data inizio"
    const val ENDING_DATE = "Data fine"
    const val PERIOD_TYPE = "Tipo periodo"
    const val JOB_NO = "Nr. commessa"
    const val DESCRIPTION = "Descrizione"
    const val TYPE = "Tipo"
    const val NO = "Nr."
    const val QUANTITY = "Quantità"
    const val UNIT_OF_MEASURE = "UdM"
    const val WORK_TYPE = "Tipo lavoro"
    const val CHARGEABLE = "Addebitabile"
    const val LOCATION_CODE = "Codice ubicazione"
}

// ── Day Names ──

val DAY_NAMES = listOf("Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì")
val DAY_NAMES_SHORT = listOf("Lun", "Mar", "Mer", "Gio", "Ven")
