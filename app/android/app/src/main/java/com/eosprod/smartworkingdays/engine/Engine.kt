package com.eosprod.smartworkingdays.engine

import com.eosprod.smartworkingdays.models.*
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale
import kotlin.math.pow

// ── Smart Working Engine ──

object SmartWorkingEngine {

    fun generateAllPermutations(week: WeekPlan, rule: SwRule): List<Permutation> {
        val workedDays = week.count { it.isWorkingDay }
        val (targetSW, _) = rule.computeTarget(workedDays)

        val freeIndices = week.mapIndexedNotNull { i, s -> if (s == DayState.FREE) i else null }
        val freeCount = freeIndices.size
        val totalPerms = 3.0.pow(freeCount).toInt()
        val results = mutableListOf<Permutation>()

        for (mask in 0 until totalPerms) {
            val candidate = week.toMutableList()
            var m = mask
            for (idx in freeIndices) {
                candidate[idx] = when (m % 3) {
                    0 -> DayState.SW
                    1 -> DayState.OFFICE
                    else -> DayState.HALF
                }
                m /= 3
            }

            val sw = candidate.count { it == DayState.SW }
            val office = candidate.count { it == DayState.OFFICE }
            val half = candidate.count { it == DayState.HALF }
            val swCount = sw + half / 2.0
            val valid = swCount <= targetSW + 0.001
            val adherence = if (targetSW > 0) minOf(swCount / targetSW, 1.0) else 1.0

            results.add(Permutation(week = candidate, totalSW = sw, totalOffice = office, totalHalf = half, valid = valid, adherence = adherence))
        }

        results.sortByDescending { it.swCount }
        return results
    }
}

// ── Timesheet Engine ──

object TimesheetEngine {

    private val dateFormatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ITALIAN)
    private val dateShortFormatter = DateTimeFormatter.ofPattern("d/M", Locale.ITALIAN)
    private val isoFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    fun getWeekNumber(date: LocalDate = LocalDate.now()): Int {
        return date.get(WeekFields.of(Locale.ITALY).weekOfWeekBasedYear())
    }

    fun getWeekRange(weekNo: Int, year: Int = LocalDate.now().year): Pair<String, String> {
        val jan4 = LocalDate.of(year, 1, 4)
        val week1Monday = jan4.with(java.time.DayOfWeek.MONDAY)
        val monday = week1Monday.plusWeeks((weekNo - 1).toLong())
        val sunday = monday.plusDays(6)
        return monday.format(isoFormatter) to sunday.format(isoFormatter)
    }

    fun getWeekDates(weekNo: Int, year: Int = LocalDate.now().year): List<String> {
        val (start, _) = getWeekRange(weekNo, year)
        val monday = LocalDate.parse(start, isoFormatter)
        return (0..4).map { monday.plusDays(it.toLong()).format(isoFormatter) }
    }

    fun createEmptyTimesheet(resourceNo: String, resourceName: String, locationCode: String): Timesheet {
        val weekNo = getWeekNumber()
        val (start, end) = getWeekRange(weekNo)
        val no = "TS${String.format("%02d", weekNo)}${String.format("%02d", LocalDate.now().dayOfMonth)}"
        val header = TimesheetHeader(no = no, resourceNo = resourceNo, resourceName = resourceName, startingDate = start, endingDate = end, weekNo = weekNo)
        return Timesheet(header = header)
    }

    fun createTimesheetFromSW(
        resourceNo: String, resourceName: String, week: WeekPlan, weekNo: Int, sedeCode: String, jobNo: String? = null
    ): Timesheet {
        val (start, end) = getWeekRange(weekNo)
        val no = "TS${String.format("%02d", weekNo)}SW"
        val dates = getWeekDates(weekNo)

        val header = TimesheetHeader(
            no = no, resourceNo = resourceNo, resourceName = resourceName,
            status = TimesheetStatus.PENDING_APPROVAL, startingDate = start, endingDate = end,
            weekNo = weekNo, jobNo = jobNo ?: "", description = "Smart Working — Sett. $weekNo"
        )

        val lines = mutableListOf<TimesheetLine>()
        week.forEachIndexed { i, state ->
            if (!state.isWorkingDay) return@forEachIndexed
            val (location, hours, desc) = when (state) {
                DayState.SW -> Triple("Smart Working", 8.0, "Smart Working — ${DAY_NAMES[i]}")
                DayState.HALF -> Triple("Smart Working", 4.0, "Smart Working (mezza giornata) — ${DAY_NAMES[i]}")
                DayState.OFFICE -> Triple(sedeCode, 8.0, "Sede — ${DAY_NAMES[i]}")
                else -> return@forEachIndexed
            }
            lines.add(TimesheetLine(
                timesheetId = header.id, lineNo = lines.size + 1, type = LineType.RESOURCE,
                no = resourceNo, description = desc, quantity = hours, unitOfMeasure = UnitOfMeasure.HOURS,
                jobNo = jobNo ?: "", workType = "Billable", chargeable = true, locationCode = location, dayIndex = i
            ))
        }

        return Timesheet(header = header, lines = lines)
    }

    fun addEmptyLine(timesheet: Timesheet, dayIndex: Int): Timesheet {
        val line = TimesheetLine(timesheetId = timesheet.id, lineNo = timesheet.lines.size + 1, no = timesheet.header.resourceNo, dayIndex = dayIndex)
        timesheet.lines.add(line)
        return timesheet
    }

    fun updateLine(timesheet: Timesheet, lineId: String, updates: (TimesheetLine) -> Unit): Timesheet {
        timesheet.lines.find { it.id == lineId }?.let(updates)
        return timesheet
    }

    fun removeLine(timesheet: Timesheet, lineId: String): Timesheet {
        timesheet.lines.removeAll { it.id == lineId }
        timesheet.lines.forEachIndexed { i, line -> line.lineNo = i + 1 }
        return timesheet
    }

    fun changeStatus(timesheet: Timesheet, newStatus: TimesheetStatus): Timesheet {
        timesheet.header.status = newStatus
        timesheet.header.updatedAt = Instant.now().toString()
        return timesheet
    }

    fun groupByDay(lines: List<TimesheetLine>, weekNo: Int): List<DaySummary> {
        val dates = getWeekDates(weekNo)
        val groups = (0..4).associateWith { mutableListOf<TimesheetLine>() }
        lines.forEach { groups[it.dayIndex]?.add(it) }
        return DAY_NAMES.mapIndexed { i, name ->
            val dayLines = groups[i] ?: emptyList()
            DaySummary(dayIndex = i, dayName = name, date = dates[i], lines = dayLines, totalHours = dayLines.sumOf { it.quantity })
        }
    }

    fun computeStats(timesheet: Timesheet): TimesheetStats {
        val stats = TimesheetStats()
        timesheet.lines.forEach { line ->
            stats.totalHours += line.quantity
            stats.byDay[line.dayIndex] = (stats.byDay[line.dayIndex] ?: 0.0) + line.quantity
            val wt = line.workType.ifEmpty { "Standard" }
            stats.byWorkType[wt] = (stats.byWorkType[wt] ?: 0.0) + line.quantity
            if (line.jobNo.isNotEmpty()) stats.byJob[line.jobNo] = (stats.byJob[line.jobNo] ?: 0.0) + line.quantity
        }
        return stats
    }

    fun computeTotalHours(lines: List<TimesheetLine>): Double = lines.sumOf { it.quantity }

    fun validateTimesheet(timesheet: Timesheet): Triple<Boolean, List<String>, List<String>> {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()
        if (timesheet.header.resourceNo.isEmpty()) errors.add("Nr. risorsa obbligatorio")
        if (timesheet.header.resourceName.isEmpty()) errors.add("Nome risorsa obbligatorio")
        if (timesheet.lines.isEmpty()) warnings.add("Nessuna riga inserita")
        timesheet.lines.forEach { line ->
            if (line.quantity <= 0) errors.add("Riga ${line.lineNo}: Quantità deve essere > 0")
            if (line.quantity > 24) warnings.add("Riga ${line.lineNo}: ${line.quantity}h in un giorno — verificare")
            if (line.description.isEmpty()) errors.add("Riga ${line.lineNo}: Descrizione obbligatoria")
        }
        return Triple(errors.isEmpty(), errors, warnings)
    }

    fun formatDate(iso: String): String {
        return try { LocalDate.parse(iso, isoFormatter).format(dateFormatter) } catch (_: Exception) { iso }
    }

    fun formatDateShort(iso: String): String {
        return try { LocalDate.parse(iso, isoFormatter).format(dateShortFormatter) } catch (_: Exception) { iso }
    }
}
