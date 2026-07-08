import SwiftUI

// MARK: - Planner ViewModel
@MainActor
class PlannerViewModel: ObservableObject {
    @Published var dayStates: WeekPlan = [.free, .free, .free, .free, .free]
    @Published var selectedPerm: Int?
    @Published var selectedRule = "60"
    @Published var weekStart = DateUtils.getCurrentWeekStart()
    @Published var permutations: [Permutation] = []
    @Published var existingPlan: TeamMember?
    @Published var planLoading = false
    @Published var publishing = false
    @Published var publishMsg: String?
    @Published var publishSuccess = false
    @Published var saveName = ""
    @Published var saving = false
    @Published var deleting = false
    @Published var deleteMsg: String?
    @Published var deleteSuccess = false
    @Published var displayName = ""
    @Published var employeeId = ""
    @Published var locationCode = "MILANO"
    
    private let authService = AuthService()
    private let plansService = PlansService()
    
    let ruleOptions: [(String, String)] = [
        ("60", "60% Smart Working"),
        ("40", "40% Smart Working"),
        ("fixed2", "Max 2 giorni SW"),
        ("fixed3", "Max 3 giorni SW"),
    ]
    
    var swRule: SwRule {
        switch selectedRule {
        case "60": return SwRule(type: "percentage", value: 60)
        case "40": return SwRule(type: "percentage", value: 40)
        case "fixed2": return SwRule(type: "fixed", value: 2)
        case "fixed3": return SwRule(type: "fixed", value: 3)
        default: return SwRule(type: "percentage", value: 60)
        }
    }
    
    init() {
        if let session = authService.loadSession() {
            displayName = session.name
            employeeId = session.userId
            locationCode = session.locationCode
        }
        recompute()
        Task { await loadExistingPlan() }
    }
    
    func cycleDay(_ index: Int) {
        let order: [DayState] = [.free, .sw, .office, .absent]
        let current = dayStates[index]
        let nextIdx = (order.firstIndex(of: current)! + 1) % order.count
        dayStates[index] = order[nextIdx]
        selectedPerm = nil
        recompute()
    }
    
    func changeWeek(_ direction: Int) {
        let d = DateUtils.parseDate(weekStart)
        let newDate = Calendar.current.date(byAdding: .day, value: direction * 7, to: d)!
        weekStart = DateUtils.formatLocalDate(newDate)
        selectedPerm = nil
        recompute()
        Task { await loadExistingPlan() }
    }
    
    func goToCurrentWeek() {
        weekStart = DateUtils.getCurrentWeekStart()
        selectedPerm = nil
        recompute()
        Task { await loadExistingPlan() }
    }
    
    func recompute() {
        permutations = SmartWorkingEngine.generateAllPermutations(dayStates: dayStates, rule: swRule)
    }
    
    func publish() async {
        guard let idx = selectedPerm, idx < permutations.count else { return }
        let perm = permutations[idx]
        guard perm.valid else { return }
        
        publishing = true
        publishMsg = nil
        
        let result = await plansService.savePlanning(
            employeeId: employeeId, employeeName: displayName, department: "LABS",
            locationCode: locationCode, weekStart: weekStart, week: perm.week,
            swDaysRequested: Int(perm.totalSW)
        )
        
        publishing = false
        publishSuccess = result.success
        publishMsg = result.success ? "Pianificazione inviata! Il team può vederla." : (result.error ?? "Errore")
        
        if result.success {
            existingPlan = TeamMember(employeeId: employeeId, employeeName: displayName, locationCode: locationCode, week: perm.week, swDaysRequested: Int(perm.totalSW))
        }
    }
    
    func deletePlan() async {
        deleting = true
        deleteMsg = nil
        
        let result = await plansService.deletePlanning(employeeId: employeeId, weekStart: weekStart)
        
        deleting = false
        deleteSuccess = result.success
        deleteMsg = result.success ? "Pianificazione cancellata!" : (result.error ?? "Errore")
        
        if result.success {
            existingPlan = nil
            dayStates = [.free, .free, .free, .free, .free]
            selectedPerm = nil
            recompute()
        }
    }
    
    func editExisting() {
        guard let plan = existingPlan else { return }
        dayStates = plan.week
        existingPlan = nil
        selectedPerm = nil
        recompute()
    }
    
    private func loadExistingPlan() async {
        planLoading = true
        if let plan = await plansService.fetchEmployeePlan(employeeId: employeeId, weekStart: weekStart) {
            existingPlan = plan
            dayStates = plan.week
            recompute()
        } else {
            existingPlan = nil
        }
        planLoading = false
    }
}
