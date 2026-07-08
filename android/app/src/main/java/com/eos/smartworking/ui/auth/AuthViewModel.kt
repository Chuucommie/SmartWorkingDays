package com.eos.smartworking.ui.auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.eos.smartworking.data.AuthRepository
import com.eos.smartworking.data.EmailService
import com.eos.smartworking.data.TursoApi
import com.eos.smartworking.model.AuthUser
import com.eos.smartworking.model.Session
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val mode: AuthMode = AuthMode.LOGIN,
    val email: String = "",
    val password: String = "",
    val name: String = "",
    val location: String = "",
    val resetEmail: String = "",
    val resetToken: String = "",
    val newPassword: String = "",
    val error: String? = null,
    val success: String? = null,
    val loading: Boolean = false,
    val loggedInUser: AuthUser? = null,
)

enum class AuthMode { LOGIN, REGISTER, FORGOT, RESET }

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    // Config — hardcoded come nell'app web
    private val tursoUrl = "https://smartworking-chuucommie.aws-eu-west-1.turso.io"
    private val tursoToken = "" // Verrà preso da config o env

    private val tursoApi = TursoApi(tursoUrl, tursoToken)
    private val authRepo = AuthRepository(application, tursoApi)

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state

    init {
        viewModelScope.launch {
            val session = authRepo.loadSession()
            if (session != null) {
                _state.value = _state.value.copy(
                    loggedInUser = AuthUser(session.userId, session.email, session.name, session.department, session.locationCode)
                )
            }
        }
    }

    fun setMode(mode: AuthMode) {
        _state.value = _state.value.copy(mode = mode, error = null, success = null)
    }

    fun updateEmail(v: String) { _state.value = _state.value.copy(email = v) }
    fun updatePassword(v: String) { _state.value = _state.value.copy(password = v) }
    fun updateName(v: String) { _state.value = _state.value.copy(name = v) }
    fun updateLocation(v: String) { _state.value = _state.value.copy(location = v) }
    fun updateResetEmail(v: String) { _state.value = _state.value.copy(resetEmail = v) }
    fun updateResetToken(v: String) { _state.value = _state.value.copy(resetToken = v) }
    fun updateNewPassword(v: String) { _state.value = _state.value.copy(newPassword = v) }

    fun submit() {
        val s = _state.value
        viewModelScope.launch {
            _state.value = s.copy(loading = true, error = null, success = null)

            when (s.mode) {
                AuthMode.LOGIN -> {
                    val result = authRepo.login(s.email, s.password)
                    if (result.success && result.user != null) {
                        authRepo.saveSession(Session(
                            userId = result.user.id, email = result.user.email,
                            name = result.user.name, department = result.user.department,
                            locationCode = result.user.locationCode, token = tursoToken
                        ))
                        _state.value = _state.value.copy(loading = false, loggedInUser = result.user)
                    } else {
                        _state.value = _state.value.copy(loading = false, error = result.error)
                    }
                }
                AuthMode.REGISTER -> {
                    if (s.name.isBlank() || s.location.isBlank()) {
                        _state.value = _state.value.copy(loading = false, error = "Compila tutti i campi")
                        return@launch
                    }
                    val result = authRepo.register(s.email, s.password, s.name.trim(), "LABS", s.location)
                    if (result.success && result.user != null) {
                        authRepo.saveSession(Session(
                            userId = result.user.id, email = result.user.email,
                            name = result.user.name, department = result.user.department,
                            locationCode = result.user.locationCode, token = tursoToken
                        ))
                        _state.value = _state.value.copy(loading = false, loggedInUser = result.user)
                    } else {
                        _state.value = _state.value.copy(loading = false, error = result.error)
                    }
                }
                AuthMode.FORGOT -> {
                    val result = authRepo.requestPasswordReset(s.resetEmail)
                    if (result.success && result.token != null) {
                        EmailService.sendPasswordResetEmail(s.resetEmail, result.token)
                        _state.value = _state.value.copy(
                            loading = false,
                            success = "Email inviata! Controlla la tua casella.",
                            resetToken = result.token,
                            mode = AuthMode.RESET
                        )
                    } else {
                        _state.value = _state.value.copy(loading = false, error = result.error)
                    }
                }
                AuthMode.RESET -> {
                    if (s.newPassword.length < 6) {
                        _state.value = _state.value.copy(loading = false, error = "Password minima 6 caratteri")
                        return@launch
                    }
                    val result = authRepo.resetPassword(s.resetEmail, s.resetToken, s.newPassword)
                    if (result.success) {
                        _state.value = _state.value.copy(
                            loading = false,
                            success = "Password reimpostata! Ora puoi accedere.",
                            mode = AuthMode.LOGIN,
                            email = s.resetEmail,
                            password = ""
                        )
                    } else {
                        _state.value = _state.value.copy(loading = false, error = result.error)
                    }
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepo.clearSession()
            _state.value = AuthUiState()
        }
    }
}
