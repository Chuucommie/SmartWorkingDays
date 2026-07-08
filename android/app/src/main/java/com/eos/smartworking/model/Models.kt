package com.eos.smartworking.model

import com.google.gson.annotations.SerializedName

/** Stato di un giorno della settimana */
enum class DayState {
    @SerializedName("free") FREE,
    @SerializedName("sw") SW,
    @SerializedName("office") OFFICE,
    @SerializedName("absent") ABSENT,
    @SerializedName("half") HALF
}

/** Piano settimanale: 5 giorni (Lun-Ven) */
typealias WeekPlan = List<DayState>

/** Regola Smart Working */
data class SwRule(
    val type: String,   // "percentage" o "fixed"
    val value: Int       // 60, 40, 2, 3...
)

/** Utente autenticato */
data class AuthUser(
    val id: String,
    val email: String,
    val name: String,
    val department: String,
    val locationCode: String
)

/** Sessione salvata localmente */
data class Session(
    val userId: String,
    val email: String,
    val name: String,
    val department: String,
    val locationCode: String,
    val token: String
)

/** Permutazione generata dall'engine */
data class Permutation(
    val week: WeekPlan,
    val totalSW: Double,
    val totalOffice: Double,
    val valid: Boolean,
    val adherence: Double  // 0.0 - 1.0
)

/** Membro del team nella vista team */
data class TeamMember(
    val employeeId: String,
    val employeeName: String,
    val locationCode: String,
    val week: WeekPlan,
    val swDaysRequested: Int
)

/** Profilo utente (da Turso) */
data class UserProfile(
    val employeeId: String,
    val email: String,
    val displayName: String,
    val locationCode: String,
    val department: String
)

/** Risultato operazione generica */
data class OperationResult(
    val success: Boolean,
    val error: String? = null
)

/** Risultato autenticazione */
data class AuthResult(
    val success: Boolean,
    val user: AuthUser? = null,
    val error: String? = null
)

/** Risultato reset password */
data class ResetResult(
    val success: Boolean,
    val token: String? = null,
    val error: String? = null
)
