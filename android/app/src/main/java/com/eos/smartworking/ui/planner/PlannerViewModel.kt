package com.eos.smartworking.ui.planner

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.eos.smartworking.data.AuthRepository
import com.eos.smartworking.data.PlansRepository
import com.eos.smartworking.data.TursoApi
import com.eos.smartworking.logic.SmartWorkingEngine
import com.eos.smartworking.model.*
import com.eos.smartworking.util.DateUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class PlannerUiState(
    val dayStates: WeekPlan = listOf(DayState.FREE, DayState.FREE, DayState.FREE, DayState.FREE, DayState.FREE),
    val selectedPerm: Int? = null,
    val selectedRule: String = "60",
    val weekStart: String = DateUtils.getCurrentWeekStart(),
    val permutations: List<Permutation> = emptyList(),
    val existingPlan: TeamMember? = null,
    val planLoading: Boolean = false,
    val publishing: Boolean = false,
    val publishMsg: String? = null,
    val publishSuccess: Boolean = false,
    val saveName: String = "",
    val saving: Boolean = false,
    val saveMsg: String? = null,
    val saveSuccess: Boolean = false,
    val deleting: Boolean = false,
    val deleteMsg: String? = null,
    val deleteSuccess: Boolean = false,
    val displayName: String = "",
    val employeeId: String = "",
    val locationCode: String = "MILANO",
)

class PlannerViewModel(application: Application) : AndroidViewModel(application) {

    private val tursoUrl = "https://smartworking-chuucommie.aws-eu-west-1.turso.io"
    private val tursoToken = ""
    private val tursoApi = TursoApi(tursoUrl, tursoToken)
    private val authRepo = AuthRepository(application, tursoApi)
    private val plansRepo = PlansRepository(tursoApi)

    private val _state = MutableStateFlow(PlannerUiState())
    val state: StateFlow<PlannerUiState> = _state

    val ruleOptions = listOf(
        "60" to "60% Smart Working",
        "40" to "40% Smart Working",
        "fixed2" to "Max 2 giorni SW",
        "fixed3" to "Max 3 giorni SW",
    )

    val swRule: SwRule
        get() {
            val v = _state.value.selectedRule
            return when (v) {
                "60" -> SwRule("percentage", 60)
                "40" -> SwRule("percentage", 40)
                "fixed2" -> SwRule("fixed", 2)
                "fixed3" -> SwRule("fixed", 3)
                else -> SwRule("percentage", 60)
            }
        }

    init {
        viewModelScope.launch {
            val session = authRepo.loadSession()
            if (session != null) {
                _state.value = _state.value.copy(
                    displayName = session.name,
                    employeeId = session.userId,
                    locationCode = session.locationCode
                )
            }
            recompute()
            loadExistingPlan()
        }
    }

    fun cycleDay(index: Int) {
        val order = listOf(DayState.FREE, DayState.SW, DayState.OFFICE, DayState.ABSENT)
        val current = _state.value.dayStates[index]
        val nextIdx = (order.indexOf(current) + 1) % order.size
        val newDays = _state.value.dayStates.toMutableList()
        newDays[index] = order[nextIdx]
        _state.value = _state.value.copy(dayStates = newDays, selectedPerm = null)
        recompute()
    }

    fun setRule(rule: String) {
        _state.value = _state.value.copy(selectedRule = rule, selectedPerm = null)
        recompute()
    }

    fun changeWeek(direction: Int) {
        val d = DateUtils.parseDate(_state.value.weekStart)
        val newDate = d.plusWeeks(direction.toLong())
        _state.value = _state.value.copy(weekStart = DateUtils.formatLocalDate(newDate), selectedPerm = null)
        recompute()
        loadExistingPlan()
    }

    fun goToCurrentWeek() {
        _state.value = _state.value.copy(weekStart = DateUtils.getCurrentWeekStart(), selectedPerm = null)
        recompute()
        loadExistingPlan()
    }

    fun selectPerm(index: Int) {
        val current = _state.value.selectedPerm
        _state.value = _state.value.copy(selectedPerm = if (current == index) null else index)
    }

    fun updateSaveName(v: String) { _state.value = _state.value.copy(saveName = v) }
    fun setSaving(v: Boolean) { _state.value = _state.value.copy(saving = v, saveName = if (!v) "" else _state.value.saveName) }

    fun publish() {
        val s = _state.value
        val idx = s.selectedPerm ?: return
        val perm = s.permutations.getOrNull(idx) ?: return
        if (!perm.valid) return

        viewModelScope.launch {
            _state.value = s.copy(publishing = true, publishMsg = null)
            val result = plansRepo.savePlanning(
                employeeId = s.employeeId,
                employeeName = s.displayName,
                department = "LABS",
                locationCode = s.locationCode,
                weekStart = s.weekStart,
                week = perm.week,
                swDaysRequested = perm.totalSW.toInt()
            )
            _state.value = _state.value.copy(
                publishing = false,
                publishSuccess = result.success,
                publishMsg = if (result.success) "Pianificazione inviata! Il team può vederla." else (result.error ?: "Errore"),
                existingPlan = if (result.success) TeamMember(s.employeeId, s.displayName, s.locationCode, perm.week, perm.totalSW.toInt()) else _state.value.existingPlan
            )
        }
    }

    fun deletePlan() {
        val s = _state.value
        viewModelScope.launch {
            _state.value = _state.value.copy(deleting = true, deleteMsg = null)
            val result = plansRepo.deletePlanning(s.employeeId, s.weekStart)
            _state.value = _state.value.copy(
                deleting = false,
                deleteSuccess = result.success,
                deleteMsg = if (result.success) "Pianificazione cancellata!" else (result.error ?: "Errore"),
                existingPlan = if (result.success) null else _state.value.existingPlan,
                dayStates = if (result.success) listOf(DayState.FREE, DayState.FREE, DayState.FREE, DayState.FREE, DayState.FREE) else _state.value.dayStates,
                selectedPerm = if (result.success) null else _state.value.selectedPerm
            )
            if (result.success) recompute()
        }
    }

    fun editExisting() {
        val plan = _state.value.existingPlan ?: return
        _state.value = _state.value.copy(dayStates = plan.week, existingPlan = null, selectedPerm = null)
        recompute()
    }

    private fun recompute() {
        val perms = SmartWorkingEngine.generateAllPermutations(_state.value.dayStates, swRule)
        _state.value = _state.value.copy(permutations = perms)
    }

    private fun loadExistingPlan() {
        viewModelScope.launch {
            _state.value = _state.value.copy(planLoading = true)
            val plan = plansRepo.fetchEmployeePlan(_state.value.employeeId, _state.value.weekStart)
            _state.value = _state.value.copy(
                planLoading = false,
                existingPlan = plan,
                dayStates = plan?.week ?: _state.value.dayStates
            )
            recompute()
        }
    }

    fun clearMessages() {
        _state.value = _state.value.copy(publishMsg = null, saveMsg = null, deleteMsg = null)
    }
}
