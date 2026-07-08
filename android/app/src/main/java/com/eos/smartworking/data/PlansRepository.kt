package com.eos.smartworking.data

import com.eos.smartworking.model.DayState
import com.eos.smartworking.model.OperationResult
import com.eos.smartworking.model.TeamMember
import com.eos.smartworking.model.WeekPlan
import com.eos.smartworking.util.DateUtils

/**
 * Repository per le pianificazioni su Turso.
 * Equivalente a planBackend.ts + tursoPlans.ts
 */
class PlansRepository(private val tursoApi: TursoApi) {

    suspend fun savePlanning(
        employeeId: String,
        employeeName: String,
        department: String,
        locationCode: String,
        weekStart: String,
        week: WeekPlan,
        swDaysRequested: Int
    ): OperationResult {
        return try {
            val normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            val weekJson = week.joinToString(",") { it.name.lowercase() }

            // Upsert
            val existing = tursoApi.execute(
                "SELECT id FROM sw_plans WHERE employee_id = ? AND week_start = ?",
                listOf(employeeId, normalizedWeek)
            )

            if (existing.isNotEmpty()) {
                tursoApi.execute(
                    """UPDATE sw_plans SET week = ?, sw_days_requested = ?, employee_name = ?,
                       department = ?, location_code = ?, updated_at = ?
                       WHERE employee_id = ? AND week_start = ?""",
                    listOf(weekJson, swDaysRequested, employeeName, department, locationCode,
                        java.time.Instant.now().toString(), employeeId, normalizedWeek)
                )
            } else {
                tursoApi.execute(
                    """INSERT INTO sw_plans (employee_id, employee_name, department, location_code,
                       week_start, week, sw_days_requested, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    listOf(employeeId, employeeName, department, locationCode, normalizedWeek,
                        weekJson, swDaysRequested,
                        java.time.Instant.now().toString(), java.time.Instant.now().toString())
                )
            }
            OperationResult(true)
        } catch (e: Exception) {
            OperationResult(false, e.message ?: "Errore salvataggio")
        }
    }

    suspend fun fetchEmployeePlan(employeeId: String, weekStart: String): TeamMember? {
        return try {
            val normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            val rows = tursoApi.execute(
                """SELECT employee_id, employee_name, location_code, week, sw_days_requested
                   FROM sw_plans WHERE employee_id = ? AND week_start = ?""",
                listOf(employeeId, normalizedWeek)
            )
            if (rows.isEmpty()) return null

            val row = rows[0]
            val weekStr = row["week"] as? String ?: return null
            val week = weekStr.split(",").map { s ->
                try { DayState.valueOf(s.uppercase()) } catch (_: Exception) { DayState.FREE }
            }

            TeamMember(
                employeeId = row["employee_id"] as? String ?: "",
                employeeName = row["employee_name"] as? String ?: "",
                locationCode = row["location_code"] as? String ?: "",
                week = week,
                swDaysRequested = (row["sw_days_requested"] as? String)?.toIntOrNull() ?: 0
            )
        } catch (_: Exception) {
            null
        }
    }

    suspend fun deletePlanning(employeeId: String, weekStart: String): OperationResult {
        return try {
            val normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            tursoApi.execute(
                "DELETE FROM sw_plans WHERE employee_id = ? AND week_start = ?",
                listOf(employeeId, normalizedWeek)
            )
            OperationResult(true)
        } catch (e: Exception) {
            OperationResult(false, e.message ?: "Errore cancellazione")
        }
    }

    suspend fun fetchTeamPlans(weekStart: String, locationCode: String? = null): List<TeamMember> {
        return try {
            val normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            val sql = if (locationCode != null && locationCode != "ALL") {
                "SELECT employee_id, employee_name, location_code, week, sw_days_requested FROM sw_plans WHERE week_start = ? AND location_code = ?"
            } else {
                "SELECT employee_id, employee_name, location_code, week, sw_days_requested FROM sw_plans WHERE week_start = ?"
            }
            val args = if (locationCode != null && locationCode != "ALL") {
                listOf(normalizedWeek, locationCode)
            } else {
                listOf(normalizedWeek)
            }

            val rows = tursoApi.execute(sql, args)
            rows.mapNotNull { row ->
                val weekStr = row["week"] as? String ?: return@mapNotNull null
                val week = weekStr.split(",").map { s ->
                    try { DayState.valueOf(s.uppercase()) } catch (_: Exception) { DayState.FREE }
                }
                TeamMember(
                    employeeId = row["employee_id"] as? String ?: "",
                    employeeName = row["employee_name"] as? String ?: "",
                    locationCode = row["location_code"] as? String ?: "",
                    week = week,
                    swDaysRequested = (row["sw_days_requested"] as? String)?.toIntOrNull() ?: 0
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}
