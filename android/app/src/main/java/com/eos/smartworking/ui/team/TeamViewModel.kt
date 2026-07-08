package com.eos.smartworking.ui.team

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.eos.smartworking.data.AuthRepository
import com.eos.smartworking.data.PlansRepository
import com.eos.smartworking.data.TursoApi
import com.eos.smartworking.model.DayState
import com.eos.smartworking.model.TeamMember
import com.eos.smartworking.util.DateUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class TeamUiState(
    val weekStart: String = DateUtils.getCurrentWeekStart(),
    val locationFilter: String = "",
    val myPlan: TeamMember? = null,
    val colleagues: List<TeamMember> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
    val deleting: Boolean = false,
    val deleteMsg: String? = null,
    val deleteSuccess: Boolean = false,
    val myEmployeeId: String = "",
    val myLocationCode: String = "",
)

class TeamViewModel(application: Application) : AndroidViewModel(application) {

    private val tursoUrl = "https://smartworking-chuucommie.aws-eu-west-1.turso.io"
    private val tursoToken = ""
    private val tursoApi = TursoApi(tursoUrl, tursoToken)
    private val authRepo = AuthRepository(application, tursoApi)
    private val plansRepo = PlansRepository(tursoApi)

    private val _state = MutableStateFlow(TeamUiState())
    val state: StateFlow<TeamUiState> = _state

    val locations = listOf("TREVISO", "BOLOGNA", "MILANO")

    init {
        viewModelScope.launch {
            val session = authRepo.loadSession()
            if (session != null) {
                _state.value = _state.value.copy(
                    myEmployeeId = session.userId,
                    myLocationCode = session.locationCode
                )
            }
            loadTeamData()
        }
    }

    fun changeWeek(direction: Int) {
        val d = DateUtils.parseDate(_state.value.weekStart)
        _state.value = _state.value.copy(weekStart = DateUtils.formatLocalDate(d.plusWeeks(direction.toLong())))
        loadTeamData()
    }

    fun goToCurrentWeek() {
        _state.value = _state.value.copy(weekStart = DateUtils.getCurrentWeekStart())
        loadTeamData()
    }

    fun setLocationFilter(filter: String) {
        _state.value = _state.value.copy(locationFilter = filter)
        loadTeamData()
    }

    fun loadTeamData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val filter = _state.value.locationFilter.ifEmpty { _state.value.myLocationCode }
                val allPlans = plansRepo.fetchTeamPlans(_state.value.weekStart, if (filter == "ALL") null else filter)

                val myPlan = allPlans.find { it.employeeId == _state.value.myEmployeeId }
                val colleagues = allPlans.filter { it.employeeId != _state.value.myEmployeeId }

                _state.value = _state.value.copy(
                    loading = false,
                    myPlan = myPlan,
                    colleagues = colleagues
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message)
            }
        }
    }

    fun deleteMyPlan() {
        viewModelScope.launch {
            _state.value = _state.value.copy(deleting = true, deleteMsg = null)
            val result = plansRepo.deletePlanning(_state.value.myEmployeeId, _state.value.weekStart)
            _state.value = _state.value.copy(
                deleting = false,
                deleteSuccess = result.success,
                deleteMsg = if (result.success) "Pianificazione cancellata!" else (result.error ?: "Errore")
            )
            if (result.success) loadTeamData()
        }
    }

    fun computeOfficeOverlaps(): Map<Int, List<String>> {
        val myPlan = _state.value.myPlan ?: return emptyMap()
        val overlaps = mutableMapOf<Int, MutableList<String>>()
        myPlan.week.forEachIndexed { i, s ->
            if (s == DayState.OFFICE) {
                val inOffice = _state.value.colleagues.filter { it.week.getOrNull(i) == DayState.OFFICE }
                if (inOffice.isNotEmpty()) {
                    overlaps[i] = inOffice.map { it.employeeName }.toMutableList()
                }
            }
        }
        return overlaps
    }
}
