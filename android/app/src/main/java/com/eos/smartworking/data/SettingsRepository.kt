package com.eos.smartworking.data

import com.eos.smartworking.model.OperationResult
import com.eos.smartworking.model.UserProfile

/**
 * Repository per le impostazioni utente su Turso.
 * Equivalente a tursoSettings.ts
 */
class SettingsRepository(private val tursoApi: TursoApi) {

    suspend fun loadUserProfile(userId: String): UserProfile? {
        return try {
            val rows = tursoApi.execute(
                "SELECT employee_id, email, display_name, location_code, department FROM user_settings WHERE user_id = ?",
                listOf(userId)
            )
            if (rows.isEmpty()) return null

            val row = rows[0]
            UserProfile(
                employeeId = row["employee_id"] as? String ?: userId,
                email = row["email"] as? String ?: "",
                displayName = row["display_name"] as? String ?: "",
                locationCode = row["location_code"] as? String ?: "",
                department = row["department"] as? String ?: "IT"
            )
        } catch (_: Exception) {
            null
        }
    }

    suspend fun saveUserProfile(
        userId: String,
        email: String,
        displayName: String,
        locationCode: String,
        department: String
    ): OperationResult {
        return try {
            val existing = tursoApi.execute(
                "SELECT user_id FROM user_settings WHERE user_id = ?",
                listOf(userId)
            )

            val now = java.time.Instant.now().toString()
            if (existing.isNotEmpty()) {
                tursoApi.execute(
                    """UPDATE user_settings SET display_name = ?, location_code = ?,
                       department = ?, updated_at = ? WHERE user_id = ?""",
                    listOf(displayName, locationCode, department, now, userId)
                )
            } else {
                tursoApi.execute(
                    """INSERT INTO user_settings (user_id, employee_id, email, display_name,
                       location_code, department, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    listOf(userId, userId, email, displayName, locationCode, department, now, now)
                )
            }
            OperationResult(true)
        } catch (e: Exception) {
            OperationResult(false, e.message ?: "Errore salvataggio")
        }
    }
}
