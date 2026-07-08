package com.eos.smartworking.util

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale

/** Utility per date — equivalente a teamWatcher.ts */
object DateUtils {

    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val weekRangeFormatter = DateTimeFormatter.ofPattern("d MMM", Locale.ITALIAN)

    fun getCurrentWeekStart(): String {
        val today = LocalDate.now()
        return today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).format(dateFormatter)
    }

    fun normalizeToMonday(dateStr: String): String {
        val date = LocalDate.parse(dateStr, dateFormatter)
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).format(dateFormatter)
    }

    fun formatLocalDate(date: LocalDate): String = date.format(dateFormatter)

    fun formatWeekRange(start: String): String {
        val d = LocalDate.parse(start, dateFormatter)
        val end = d.plusDays(4)
        return "${d.format(weekRangeFormatter)} – ${end.format(weekRangeFormatter)}"
    }

    fun parseDate(dateStr: String): LocalDate = LocalDate.parse(dateStr, dateFormatter)
}
