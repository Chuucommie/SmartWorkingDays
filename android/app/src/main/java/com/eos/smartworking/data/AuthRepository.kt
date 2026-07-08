package com.eos.smartworking.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.eos.smartworking.model.*
import com.eos.smartworking.util.Crypto
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "eos_session")

/**
 * Repository autenticazione — login, register, reset password, cambio email.
 * Equivalente a tursoAuth.ts
 */
class AuthRepository(
    private val context: Context,
    private val tursoApi: TursoApi
) {
    private val gson = Gson()

    companion object {
        private val KEY_SESSION = stringPreferencesKey("session_json")
    }

    // ── Sessione locale (DataStore = localStorage) ──

    suspend fun saveSession(session: Session) {
        context.dataStore.edit { prefs ->
            prefs[KEY_SESSION] = gson.toJson(session)
        }
    }

    suspend fun loadSession(): Session? {
        val json = context.dataStore.data.map { it[KEY_SESSION] }.first()
        return try {
            json?.let { gson.fromJson(it, Session::class.java) }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { it.remove(KEY_SESSION) }
    }

    suspend fun isLoggedIn(): Boolean = loadSession() != null

    // ── Auth operations ──

    suspend fun register(
        email: String, password: String, name: String,
        department: String, locationCode: String
    ): AuthResult {
        return try {
            val existing = tursoApi.execute("SELECT id FROM users WHERE email = ?", listOf(email))
            if (existing.isNotEmpty()) return AuthResult(false, error = "Email già registrata")

            val id = Crypto.generateUserId()
            val salt = Crypto.generateSalt()
            val passwordHash = Crypto.hashPassword(password, salt)
            val now = java.time.Instant.now().toString()

            tursoApi.execute(
                """INSERT INTO users (id, email, password_hash, name, department, location_code, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                listOf(id, email, "$salt:$passwordHash", name, department, locationCode, now, now)
            )

            val user = AuthUser(id, email, name, department, locationCode)
            AuthResult(true, user = user)
        } catch (e: Exception) {
            AuthResult(false, error = e.message ?: "Errore sconosciuto")
        }
    }

    suspend fun login(email: String, password: String): AuthResult {
        return try {
            val rows = tursoApi.execute(
                "SELECT id, email, password_hash, name, department, location_code FROM users WHERE email = ?",
                listOf(email)
            )
            if (rows.isEmpty()) return AuthResult(false, error = "Email non trovata")

            val row = rows[0]
            val storedHash = row["password_hash"] as? String ?: return AuthResult(false, error = "Dati utente corrotti")
            val parts = storedHash.split(":")
            if (parts.size < 2) return AuthResult(false, error = "Dati utente corrotti")

            val salt = parts[0]
            val hash = parts[1]
            val computedHash = Crypto.hashPassword(password, salt)
            if (computedHash != hash) return AuthResult(false, error = "Password errata")

            val user = AuthUser(
                id = row["id"] as? String ?: "",
                email = row["email"] as? String ?: "",
                name = row["name"] as? String ?: "",
                department = (row["department"] as? String) ?: "IT",
                locationCode = (row["location_code"] as? String) ?: "MILANO"
            )
            AuthResult(true, user = user)
        } catch (e: Exception) {
            AuthResult(false, error = e.message ?: "Errore sconosciuto")
        }
    }

    suspend fun requestPasswordReset(email: String): ResetResult {
        return try {
            val rows = tursoApi.execute("SELECT id FROM users WHERE email = ?", listOf(email))
            if (rows.isEmpty()) return ResetResult(false, error = "Email non trovata")

            val token = Crypto.generateResetToken()
            val expires = java.time.Instant.now().plusSeconds(3600).toString()
            val now = java.time.Instant.now().toString()

            tursoApi.execute(
                "INSERT OR REPLACE INTO password_resets (email, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
                listOf(email, token, expires, now)
            )
            ResetResult(true, token = token)
        } catch (e: Exception) {
            ResetResult(false, error = e.message ?: "Errore sconosciuto")
        }
    }

    suspend fun resetPassword(email: String, token: String, newPassword: String): AuthResult {
        return try {
            val rows = tursoApi.execute(
                "SELECT token, expires_at FROM password_resets WHERE email = ? AND token = ?",
                listOf(email, token)
            )
            if (rows.isEmpty()) return AuthResult(false, error = "Token non valido")

            val expiresStr = rows[0]["expires_at"] as? String ?: ""
            val expires = java.time.Instant.parse(expiresStr)
            if (expires < java.time.Instant.now()) {
                tursoApi.execute("DELETE FROM password_resets WHERE email = ?", listOf(email))
                return AuthResult(false, error = "Token scaduto")
            }

            val salt = Crypto.generateSalt()
            val passwordHash = Crypto.hashPassword(newPassword, salt)
            val now = java.time.Instant.now().toString()

            tursoApi.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?",
                listOf("$salt:$passwordHash", now, email)
            )
            tursoApi.execute("DELETE FROM password_resets WHERE email = ?", listOf(email))
            AuthResult(true)
        } catch (e: Exception) {
            AuthResult(false, error = e.message ?: "Errore sconosciuto")
        }
    }

    suspend fun changeEmail(userId: String, newEmail: String, currentPassword: String): OperationResult {
        return try {
            val rows = tursoApi.execute(
                "SELECT id, email, password_hash FROM users WHERE id = ?",
                listOf(userId)
            )
            if (rows.isEmpty()) return OperationResult(false, "Utente non trovato")

            val row = rows[0]
            val storedHash = row["password_hash"] as? String ?: return OperationResult(false, "Dati utente corrotti")
            val parts = storedHash.split(":")
            if (parts.size < 2) return OperationResult(false, "Dati utente corrotti")

            val salt = parts[0]
            val hash = parts[1]
            val computedHash = Crypto.hashPassword(currentPassword, salt)
            if (computedHash != hash) return OperationResult(false, "Password attuale errata")

            val oldEmail = row["email"] as? String ?: ""
            if (newEmail != oldEmail) {
                val existing = tursoApi.execute("SELECT id FROM users WHERE email = ?", listOf(newEmail))
                if (existing.isNotEmpty()) return OperationResult(false, "Email già in uso")
            }

            val now = java.time.Instant.now().toString()
            tursoApi.execute(
                "UPDATE users SET email = ?, updated_at = ? WHERE id = ?",
                listOf(newEmail, now, userId)
            )

            // Aggiorna sessione
            val session = loadSession()
            if (session != null) {
                saveSession(session.copy(email = newEmail))
            }

            OperationResult(true)
        } catch (e: Exception) {
            OperationResult(false, e.message ?: "Errore sconosciuto")
        }
    }
}
