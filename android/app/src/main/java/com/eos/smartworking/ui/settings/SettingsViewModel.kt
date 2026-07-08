package com.eos.smartworking.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.eos.smartworking.data.AuthRepository
import com.eos.smartworking.data.SettingsRepository
import com.eos.smartworking.data.TursoApi
import com.eos.smartworking.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class SettingsUiState(
    val profile: UserProfile? = null,
    val displayName: String = "",
    val locationCode: String = "",
    val loading: Boolean = true,
    val saving: Boolean = false,
    val saveMsg: String? = null,
    val saveSuccess: Boolean = false,
    // Cambio email
    val newEmail: String = "",
    val currentPassword: String = "",
    val emailLoading: Boolean = false,
    val emailMsg: String? = null,
    val emailSuccess: Boolean = false,
    val copied: Boolean = false,
    val userId: String = "",
    val userEmail: String = "",
)

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val tursoUrl = "https://smartworking-chuucommie.aws-eu-west-1.turso.io"
    private val tursoToken = ""
    private val tursoApi = TursoApi(tursoUrl, tursoToken)
    private val authRepo = AuthRepository(application, tursoApi)
    private val settingsRepo = SettingsRepository(tursoApi)

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state

    val locations = listOf("TREVISO", "BOLOGNA", "MILANO")

    init {
        viewModelScope.launch {
            val session = authRepo.loadSession()
            if (session != null) {
                _state.value = _state.value.copy(userId = session.userId, userEmail = session.email)
                val profile = settingsRepo.loadUserProfile(session.userId)
                if (profile != null) {
                    _state.value = _state.value.copy(
                        profile = profile,
                        displayName = profile.displayName,
                        locationCode = profile.locationCode,
                        loading = false
                    )
                } else {
                    _state.value = _state.value.copy(
                        displayName = session.name,
                        locationCode = session.locationCode,
                        loading = false
                    )
                }
            } else {
                _state.value = _state.value.copy(loading = false)
            }
        }
    }

    fun updateDisplayName(v: String) { _state.value = _state.value.copy(displayName = v) }
    fun updateLocationCode(v: String) { _state.value = _state.value.copy(locationCode = v) }
    fun updateNewEmail(v: String) { _state.value = _state.value.copy(newEmail = v) }
    fun updateCurrentPassword(v: String) { _state.value = _state.value.copy(currentPassword = v) }

    fun saveProfile() {
        val s = _state.value
        if (s.displayName.isBlank()) {
            _state.value = s.copy(saveMsg = "Inserisci il tuo nome", saveSuccess = false)
            return
        }
        if (s.locationCode.isBlank()) {
            _state.value = s.copy(saveMsg = "Seleziona la tua sede", saveSuccess = false)
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true, saveMsg = null)
            val result = settingsRepo.saveUserProfile(
                userId = s.userId,
                email = s.userEmail,
                displayName = s.displayName.trim(),
                locationCode = s.locationCode,
                department = "IT"
            )
            _state.value = _state.value.copy(
                saving = false,
                saveSuccess = result.success,
                saveMsg = if (result.success) "Impostazioni salvate nel database!" else (result.error ?: "Errore")
            )
        }
    }

    fun changeEmail() {
        val s = _state.value
        if (!s.newEmail.contains("@")) {
            _state.value = s.copy(emailMsg = "Inserisci un indirizzo email valido", emailSuccess = false)
            return
        }
        if (s.currentPassword.isBlank()) {
            _state.value = s.copy(emailMsg = "Inserisci la password attuale", emailSuccess = false)
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(emailLoading = true, emailMsg = null)
            val result = authRepo.changeEmail(s.userId, s.newEmail.trim(), s.currentPassword)
            _state.value = _state.value.copy(
                emailLoading = false,
                emailSuccess = result.success,
                emailMsg = if (result.success) "Email aggiornata con successo!" else (result.error ?: "Errore"),
                newEmail = if (result.success) "" else s.newEmail,
                currentPassword = if (result.success) "" else s.currentPassword
            )
        }
    }

    fun clearMessages() {
        _state.value = _state.value.copy(saveMsg = null, emailMsg = null)
    }
}
